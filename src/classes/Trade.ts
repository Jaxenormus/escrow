import { container } from '@sapphire/framework';
import axios, { AxiosError, AxiosInstance } from 'axios';
import interval from 'interval-promise';
import { first, isString, last } from 'lodash';
import { TradeInfo } from 'noblox.js';
import { generateToken, verifyToken } from 'node-2fa';

import { PARTIES } from '@/context';
import Account from '@/entities/Account';
import ThumbnailFetchError from '@/errors/ThumbnailFetchError';
import handleRobloxRequest from '@/helpers/limiteds/handleRobloxRequest';
import LimitedTradePreview from '@/templates/LimitedTradePreview';

export default class Trade extends Object {
  private info: TradeInfo;

  private party: PARTIES;

  private senderId: number;

  public trader: { id: number; name: string };

  public receiving: {
    rap: number;
    value: number;
    items: { id: number; name: string; image: string; rap: number; value: 0 }[];
    robux: number;
  };

  public sending: {
    rap: number;
    value: number;
    items: { id: number; name: string; image: string; rap: number; value: 0 }[];
    robux: number;
  };

  public constructor(rawInfo: TradeInfo, party: PARTIES, senderId?: number) {
    super();
    this.info = rawInfo;
    this.trader = null;
    this.receiving = { rap: 0, value: 0, items: [], robux: 0 };
    this.sending = { rap: 0, value: 0, items: [], robux: 0 };
    this.party = party;
    this.senderId = senderId;
  }

  public async init(): Promise<void> {
    this.trader = { id: this.info.user.id, name: this.info.user.name };
    const details = await axios.get('https://www.rolimons.com/itemapi/itemdetails');
    let thumbnails = null;
    try {
      thumbnails = await axios.get(`https://thumbnails.roblox.com/v1/assets`, {
        params: {
          assetIds: [
            this.info.offers.map(offer => offer.userAssets.map(asset => asset.assetId)),
          ].join(', '),
          format: 'Png',
          size: '150x150',
        },
        headers: { accept: 'application/json' },
      });
    } catch (e) {
      container.sentry.handleException(e);
      throw new ThumbnailFetchError();
    }
    const rawSending = first(this.info.offers);
    this.sending.robux = rawSending.robux;
    this.sending.items = rawSending.userAssets.map(asset => {
      const item = details.data.items[asset.assetId];
      const rap = item[2] < 0 ? 0 : item[2];
      const value = item[3] < 0 ? 0 : item[3];
      this.sending.rap += rap;
      this.sending.value += value;
      const thumbnail = thumbnails?.data?.data?.find(t => t.targetId === asset.assetId);
      return {
        id: asset.assetId,
        image: thumbnail?.imageUrl,
        name: asset.name,
        rap,
        value,
      };
    });
    const rawReceiving = last(this.info.offers);
    this.receiving.robux = rawReceiving.robux;
    this.receiving.items = last(this.info.offers).userAssets.map(asset => {
      const item = details.data.items[asset.assetId];
      const rap = item[2] < 0 ? 0 : item[2];
      const value = item[3] < 0 ? 0 : item[3];
      this.receiving.rap += rap;
      this.receiving.value += value;
      const thumbnail = thumbnails?.data?.data?.find(t => t.targetId === asset.assetId);
      return {
        id: asset.assetId,
        image: thumbnail?.imageUrl,
        name: asset.name,
        rap,
        value,
      };
    });
  }

  public async genImage(): Promise<Buffer> {
    const data = this.party === PARTIES.SENDER ? this.receiving : this.sending;
    return LimitedTradePreview.newImage(
      data.items.map(i => ({ image: i.image, rap: i.rap, value: i.value }))
    );
  }

  public isValid():
    | 'WRONG_SENDER'
    | 'HIGH_RAP'
    | 'SMALLS_LEACHER'
    | 'VALID'
    | 'NO_ITEMS'
    | 'ROBUX_LEACHER' {
    if (this.senderId && this.senderId !== this.info.user.id) return 'WRONG_SENDER';
    if (this.sending.robux > 0) return 'ROBUX_LEACHER';
    if (this.party === PARTIES.SENDER) {
      if (this.sending.rap >= 2000) return 'HIGH_RAP';
      if (this.sending.items.length !== 1) return 'SMALLS_LEACHER';
    }
    return 'VALID';
  }

  private async genTwoFactorCode(secret: string) {
    return new Promise(resolve => {
      interval(async (_, stop) => {
        const data = generateToken(secret);
        if (data && data.token) {
          const validity = verifyToken(secret, data.token);
          if (validity.delta === 0) {
            stop();
            resolve(data.token);
          }
        }
      }, 10000);
    });
  }

  public async acceptTradeWith2SV(account: Account, instance: AxiosInstance, error: AxiosError) {
    const { challengeId, actionType } = JSON.parse(
      Buffer.from(error.response.headers['rblx-challenge-metadata'], 'base64').toString('utf-8')
    );
    const verifyResponse = await instance.post(
      `https://twostepverification.roblox.com/v1/users/${account.id}/challenges/authenticator/verify`,
      { actionType, challengeId, code: await this.genTwoFactorCode(account.secret) }
    );
    const { verificationToken } = verifyResponse.data;
    try {
      await instance.post(
        error.response.config.url,
        {},
        {
          headers: {
            'rblx-challenge-id': error.response.headers['rblx-challenge-id'],
            'rblx-challenge-metadata': Buffer.from(
              JSON.stringify({ actionType, challengeId, rememberDevice: false, verificationToken })
            ).toString('base64'),
            'rblx-challenge-type': error.response.headers['rblx-challenge-type'],
          },
          timeout: 30000,
        }
      );
      return true;
    } catch (e) {
      container.sentry.handleException(e);
      return false;
    }
  }

  public async accept(
    uid: string
  ): Promise<
    | 'SUCCESS'
    | 'INVENTORY_CHANGED'
    | 'TWO_FACTOR'
    | 'INVENTORY_NOT_CHANGED'
    | 'REQUEST_TOOK_TO_LONG'
  > {
    const account = await container.db.em.findOne(Account, uid);
    const instance = await handleRobloxRequest(account, true);
    try {
      await instance.post(`https://trades.roblox.com/v1/trades/${this.info.id}/accept`, {
        timeout: 30000,
      });
    } catch (e) {
      const messages: string[] = isString(e.response.data)
        ? [e.response.data]
        : (e.response.data?.errors ?? []).map(err => err.message);
      if (
        messages.some(
          msg =>
            msg.includes('thresholds') || msg === 'Challenge is required to authorize the request'
        )
      ) {
        const success2 = await this.acceptTradeWith2SV(account, instance, e);
        if (success2) return 'SUCCESS';
        return 'TWO_FACTOR';
      }
      container.sentry.handleException(e);
      return messages[0] as any;
    }
    return new Promise(resolve => {
      interval(async (iterations, stop) => {
        if (iterations >= 6) {
          stop();
          resolve(this.party === PARTIES.RECEIVER ? 'INVENTORY_NOT_CHANGED' : 'INVENTORY_CHANGED');
        }
        try {
          const tradeInstance = await handleRobloxRequest(account);
          const tradeReq = await tradeInstance.get<TradeInfo>(
            `https://trades.roblox.com/v1/trades/${this.info.id}`
          );
          if (tradeReq.data.status === 'Completed' && !tradeReq.data.isActive) {
            stop();
            resolve('SUCCESS');
          }
        } catch (e) {
          container.sentry.handleException(e);
          resolve(e.message);
        }
      }, 5000);
    });
  }
}
