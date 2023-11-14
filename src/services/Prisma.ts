import type { Prisma, PrismaClient } from "@prisma/client";
import { Effect } from "effect";

import { PrismaError } from "@/src/errors/PrismaError";

export class PrismaService {
  public readonly prisma: PrismaClient;

  public constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public createAddress(data: Prisma.AddressCreateInput) {
    return Effect.tryPromise({
      try: () => this.prisma.address.create({ data }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof Error) {
          return new PrismaError(unknown.message);
        } else {
          return new PrismaError(unknown);
        }
      },
    });
  }

  public findAddress(where: Prisma.AddressWhereInput) {
    return Effect.tryPromise({
      try: () => this.prisma.address.findFirst({ where }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof Error) {
          return new PrismaError(unknown.message);
        } else {
          return new PrismaError(unknown);
        }
      },
    });
  }

  public createJob(data: Prisma.JobCreateInput) {
    return Effect.tryPromise({
      try: () => this.prisma.job.create({ data }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof Error) {
          return new PrismaError(unknown.message);
        } else {
          return new PrismaError(unknown);
        }
      },
    });
  }

  public deleteJob(where: Prisma.JobWhereUniqueInput) {
    return Effect.tryPromise({
      try: () => this.prisma.job.delete({ where }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof Error) {
          return new PrismaError(unknown.message);
        } else {
          return new PrismaError(unknown);
        }
      },
    });
  }

  public findJobs(where: Prisma.JobWhereInput) {
    return Effect.tryPromise({
      try: () => this.prisma.job.findMany({ where }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof Error) {
          return new PrismaError(unknown.message);
        } else {
          return new PrismaError(unknown);
        }
      },
    });
  }
}
