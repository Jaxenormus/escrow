import '@sapphire/plugin-api/register';

import { MikroORM } from '@mikro-orm/core';
import { container, SapphireClient } from '@sapphire/framework';
import { RewriteFrames } from '@sentry/integrations';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { execSync } from 'child_process';
import path from 'path';

import { GAME_TRADE_TYPES, PLACE_IDS, TRADE_TYPES } from '@/context';
import Queue from '@/entities/Queue';
import resolveNetwork from '@/helpers/crypto/utils/resolveNetwork';

import config from '../../mikro-orm.config';

export type GameData = {
  id: string;
  universeId: string;
  thumbnail: string;
  link: string;
  buildVip: (code: string) => string;
};

type GameDataContainer = {
  [key in GAME_TRADE_TYPES]: GameData;
};

export default class CustomClient extends SapphireClient {
  public constructor() {
    super({
      intents: [
        'GUILDS',
        'GUILD_MESSAGES',
        'GUILD_MEMBERS',
        'GUILD_INTEGRATIONS',
        'MESSAGE_CONTENT',
      ],
      api: { prefix: 'v1/', listenOptions: { port: 4000 } },
    });
  }

  private createCoinMarketCapInstance() {
    return CustomClient.createBaseInstance(
      {
        baseURL: 'https://pro-api.coinmarketcap.com/v2',
        headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY },
      },
      false
    );
  }

  private createBlockcypherInstance(coin: TRADE_TYPES) {
    return CustomClient.createBaseInstance(
      {
        baseURL: `https://api.blockcypher.com/v1/${resolveNetwork(coin)}`,
        params: { token: process.env.BLOCKCYPHER_TOKEN },
      },
      false
    );
  }

  static createBaseInstance(options?: AxiosRequestConfig<any>, useProxy = true, proxyPort = 10000) {
    console.log(useProxy, proxyPort);
    const instance = axios.create({
      ...options,
      // ...(useProxy ? { proxy: getProxyConfig(proxyPort) } : {}),
    });
    axiosRetry(instance, {
      retries: 5,
      retryDelay(retryCount, error) {
        const delay = axiosRetry.exponentialDelay(retryCount);
        const handShakeFailedDelay = delay + 10000;
        return (error.response?.status ?? 0) === 565 ? handShakeFailedDelay : delay;
      },
      retryCondition(error) {
        return (error.response?.status ?? 0) === 565
          ? true
          : axiosRetry.isNetworkOrIdempotentRequestError(error);
      },
    });
    return instance;
  }

  private async handleGameDataFetch() {
    const ids = Object.keys(PLACE_IDS).map(key => ({ id: PLACE_IDS[key], name: key }));
    const data = {} as GameDataContainer;
    await Promise.all(
      ids.map(async ({ id, name }) => {
        const universeIdReq = await container.api.get(
          `https://apis.roblox.com/universes/v1/places/${id}/universe`
        );
        const thumbnailReq = await container.api.get(
          `https://thumbnails.roblox.com/v1/games/icons`,
          {
            params: {
              universeIds: [universeIdReq.data.universeId],
              returnPolicy: 'PlaceHolder',
              size: '512x512',
              format: 'Png',
              isCircular: false,
            },
          }
        );
        const baseLink = `https://www.roblox.com/games/${id}`;
        data[name] = {
          id,
          universeId: universeIdReq.data.universeId,
          thumbnail: thumbnailReq.data.data[0].imageUrl,
          link: baseLink,
          buildVip: (code: string) => `${baseLink}?privateServerLinkCode=${code}`,
        };
      })
    );
    return data;
  }

  public override async login(token: string) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      release: execSync('sentry-cli releases propose-version').toString().trim(),
      integrations: [
        new RewriteFrames({ root: path.join(__dirname, '..') }),
        new ProfilingIntegration(),
      ],
      environment: process.env.NODE_ENV,
      beforeSend(event, hint) {
        if (hint && hint.originalException && (hint.originalException as AxiosError).isAxiosError) {
          const originalException = hint.originalException as AxiosError;
          if (
            (originalException.config.url.includes('.roblox.com') &&
              originalException.response?.status === 401) ||
            (originalException.response?.status === 403 &&
              originalException.config.url === 'https://users.roblox.com/v1/users/authenticated')
          ) {
            return null;
          }
          if (originalException.response && originalException.response.data) {
            const contexts = { ...event.contexts };
            contexts.response = {
              data: originalException.response.data,
              headers: originalException.response.headers,
              status: originalException.response.statusText,
              status_code: originalException.response.status,
            };
            contexts.request = {
              url: originalException.config.url,
              method: originalException.config.method,
              headers: originalException.config.headers,
              data: originalException.config.data,
            };
            // eslint-disable-next-line no-param-reassign
            event.contexts = contexts;
          }
        }
        return event;
      },
    });
    container.sentry = {
      ...Sentry,
      handleException: (error: Error) => {
        Sentry.captureException(error);
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === 'development') console.error(error);
      },
    };

    container.blockcypher = this.createBlockcypherInstance;
    container.coinmarketcap = this.createCoinMarketCapInstance();
    container.api = CustomClient.createBaseInstance();

    container.db = await MikroORM.init(config);
    const queues = await container.db.em.find(Queue, {});
    container.db.em.remove(queues);
    await container.db.em.flush();

    // container.data = { games: await this.handleGameDataFetch() };

    return super.login(token);
  }

  public override async destroy() {
    await container.db.close();
    return super.destroy();
  }
}

declare module '@sapphire/pieces' {
  interface Container {
    db: MikroORM;
    sentry: typeof Sentry & { handleException: (error: Error) => void };
    blockcypher: (coin: TRADE_TYPES) => AxiosInstance;
    coinmarketcap: AxiosInstance;
    api: AxiosInstance;
    data: { games: GameDataContainer };
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    AdminOnly: never;
    DeveloperOnly: never;
  }
}
