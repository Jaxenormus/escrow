import { Logtail } from "@logtail/node";
import { PrismaClient } from "@prisma/client";
import { container, SapphireClient } from "@sapphire/framework";
import "@sapphire/plugin-scheduled-tasks";
import { AttachmentBuilder, GatewayIntentBits } from "discord.js";
import { toLower } from "lodash";
import path from "path";
import { EventEmitter } from "stream";

import { CryptoService } from "@/src/services/Crypto";
import { InternalStatisticsService } from "@/src/services/Statistics";
import { PrismaService } from "@/src/services/Prisma";
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
    add: buildTuple(`${data}-add`),
  };
};

const cryptoAssets = {
  [TradeMediums.Bitcoin]: buildCryptoAsset(SimplifiedTradeMediums[TradeMediums.Bitcoin]),
  [TradeMediums.Ethereum]: buildCryptoAsset(SimplifiedTradeMediums[TradeMediums.Ethereum]),
  [TradeMediums.Litecoin]: buildCryptoAsset(SimplifiedTradeMediums[TradeMediums.Litecoin]),
};

const ticketEmitter = new EventEmitter();

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
      tasks: {
        bull: {
          connection: {
            port: 6379, // Defaults to 6379, but if your Redis server runs on another port configure it here
            // password: "very-strong-password", // If your Redis server requires a password configure it here
            host: "localhost", // The host at which the redis server is found
            // db: 2, // Redis database number, defaults to 0 but can be any value between 0 and 15
          },
        },
      },
    });
  }

  public override async login(token: string) {
    container.environment = process.env.NODE_ENV === "production" || process.env.RENDER ? "production" : "development";
    container.prisma = new PrismaClient();
    container.db = new PrismaService(container.prisma);
    container.api = {
      crypto: new CryptoService(container.db),
      statistics: new InternalStatisticsService(),
    };
    container.assets = { crypto: cryptoAssets };
    container.events = { ticket: ticketEmitter };
    container.log = new Logtail(process.env.LOGTAIL_TOKEN as string);
    return super.login(token);
  }

  public override async destroy() {
    await container.prisma.$disconnect();
    return super.destroy();
  }
}

declare module "@sapphire/pieces" {
  interface Container {
    db: PrismaService;
    prisma: PrismaClient;
    api: { crypto: CryptoService; statistics: InternalStatisticsService };
    assets: { crypto: typeof cryptoAssets };
    environment: "production" | "development";
    events: { ticket: typeof ticketEmitter };
    log: Logtail;
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    AdminOnly: never;
    DeveloperOnly: never;
  }
}
