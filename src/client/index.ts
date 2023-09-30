import { PrismaClient } from "@prisma/client";
import { container, SapphireClient } from "@sapphire/framework";
import * as Sentry from "@sentry/node";
import { AxiosError } from "axios";
import { AttachmentBuilder, GatewayIntentBits } from "discord.js";
import { toLower } from "lodash";
import path from "path";

import { CryptoApi } from "@/src/classes/api";
import { DB } from "@/src/classes/db";
import { TradeMediums } from "@/src/config";
import { SimplifiedTradeMediums } from "@/src/config";

const buildCryptoAsset = (data: string) => {
  const buildTuple = (name: string) => {
    const file = `${toLower(name)}.png`;
    return {
      attachment: new AttachmentBuilder(path.join(__dirname, "../assets/images", file), { name: file }),
      name: `attachment://${file}`,
    } as const;
  };
  return {
    confirmed: buildTuple(`${data}-confirmed`),
    pending: buildTuple(`${data}-pending`),
    trend: { up: buildTuple(`${data}-trend-up`), down: buildTuple(`${data}-trend-down`) },
    failed: buildTuple(`${data}-failed`),
    returned: buildTuple(`${data}-returned`),
  };
};

const cryptoAssets = {
  [TradeMediums.Bitcoin]: buildCryptoAsset(SimplifiedTradeMediums[TradeMediums.Bitcoin]),
  [TradeMediums.Ethereum]: buildCryptoAsset(SimplifiedTradeMediums[TradeMediums.Ethereum]),
  [TradeMediums.Litecoin]: buildCryptoAsset(SimplifiedTradeMediums[TradeMediums.Litecoin]),
};

export class BotClient extends SapphireClient {
  public constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  public override async login(token: string) {
    container.environment = process.env.NODE_ENV === "production" || process.env.RENDER ? "production" : "development";
    container.prisma = new PrismaClient();
    container.db = new DB(container.prisma);
    container.api = {
      crypto: new CryptoApi(container.prisma, container.db),
    };
    container.sentry = {
      ...Sentry,
      captureException: (exception: unknown): string => {
        if (container.environment === "production") {
          this.logger.debug(exception);
          return Sentry.captureException(exception);
        } else {
          if (exception instanceof AxiosError) {
            this.logger.error(exception.response?.data);
          } else {
            this.logger.error(exception);
          }
          return "handled";
        }
      },
    };
    container.sentry.init({
      dsn: "https://6baa8ee4eb3fb913ad57f78ab09f0185@o4505564155609088.ingest.sentry.io/4505936432594944",
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      release: process.env.RENDER ? process.env.RENDER_GIT_COMMIT : "local",
      environment: container.environment,
    });
    container.assets = { crypto: cryptoAssets };
    return super.login(token);
  }

  public override async destroy() {
    await container.prisma.$disconnect();
    return super.destroy();
  }
}

declare module "@sapphire/pieces" {
  interface Container {
    db: DB;
    prisma: PrismaClient;
    api: { crypto: CryptoApi };
    sentry: typeof Sentry;
    assets: { crypto: typeof cryptoAssets };
    environment: "production" | "development";
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    AdminOnly: never;
    DeveloperOnly: never;
  }
}
