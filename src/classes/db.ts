import type { Prisma, PrismaClient } from "@prisma/client";
import { container } from "@sapphire/pieces";
import { Effect } from "effect";
import { z } from "zod";

import { PrismaError } from "@/src/errors/PrismaError";

const ticketMetadataSchema = z.object({
  crypto: z.object({
    addresses: z.object({ sender: z.string(), receiver: z.string() }),
    anticipated: z.object({ raw_crypto: z.number(), raw_fiat: z.number() }),
    actual: z.object({ raw_crypto: z.number(), raw_fiat: z.number() }),
  }),
});

export class DB {
  public readonly prisma: PrismaClient;

  public constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // public findTicket(channel: GuildTextBasedChannel, include: Prisma.TicketInclude) {
  //   return Effect.tryPromise({
  //     try: () => this.prisma.ticket.findFirst({ where: { id: channel.id }, include }),
  //     catch: (unknown) => {
  //       container.sentry.captureException(unknown);
  //       if (unknown instanceof Error) {
  //         return new PrismaError(unknown.message);
  //       } else {
  //         return new PrismaError(unknown);
  //       }
  //     },
  //   });
  // }

  public createAddress(data: Prisma.AddressCreateInput) {
    return Effect.tryPromise({
      try: () => this.prisma.address.create({ data }),
      catch: (unknown) => {
        container.sentry.captureException(unknown);
        if (unknown instanceof Error) {
          return new PrismaError(unknown.message);
        } else {
          return new PrismaError(unknown);
        }
      },
    });
  }

  public findAddress(where: Prisma.AddressWhereUniqueInput) {
    return Effect.tryPromise({
      try: () => this.prisma.address.findFirst({ where }),
      catch: (unknown) => {
        container.sentry.captureException(unknown);
        if (unknown instanceof Error) {
          return new PrismaError(unknown.message);
        } else {
          return new PrismaError(unknown);
        }
      },
    });
  }

  // public createTicket(data: Prisma.TicketCreateInput) {
  //   return Effect.tryPromise({
  //     try: () => this.prisma.ticket.create({ data }),
  //     catch: (unknown) => {
  //       container.sentry.captureException(unknown);
  //       if (unknown instanceof Error) {
  //         return new PrismaError(unknown.message);
  //       } else {
  //         return new PrismaError(unknown);
  //       }
  //     },
  //   });
  // }

  // public editTicketMetadata(channel: GuildTextBasedChannel, metadata: z.infer<typeof ticketMetadataSchema>) {
  //   return Effect.tryPromise({
  //     try: async () => {
  //       const ticket = await Effect.runPromise(this.findTicket(channel, {}));
  //       const rawOldMetadata = ticketMetadataSchema.safeParse(ticket?.metadata);
  //       const oldMetadata = rawOldMetadata.success ? rawOldMetadata.data : {};
  //       return this.prisma.ticket.update({
  //         where: { id: channel.id },
  //         data: { metadata: merge(oldMetadata, metadata) },
  //       });
  //     },
  //     catch: (unknown) => {
  //       container.sentry.captureException(unknown);
  //       if (unknown instanceof Error) {
  //         return new PrismaError(unknown.message);
  //       } else {
  //         return new PrismaError(unknown);
  //       }
  //     },
  //   });
  // }

  // public editTicket(channel: GuildTextBasedChannel, data: Omit<Prisma.TicketUpdateInput, "metadata">) {
  //   return Effect.tryPromise({
  //     try: () => this.prisma.ticket.update({ where: { id: channel.id }, data }),
  //     catch: (unknown) => {
  //       container.sentry.captureException(unknown);
  //       if (unknown instanceof Error) {
  //         return new PrismaError(unknown.message);
  //       } else {
  //         return new PrismaError(unknown);
  //       }
  //     },
  //   });
  // }
}
