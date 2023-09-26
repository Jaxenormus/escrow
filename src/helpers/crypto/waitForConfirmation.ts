import { container } from "@sapphire/framework";
import { Effect, Either, Ref, Schedule } from "effect";

import { TradeMediums } from "@/src/config";

export const waitForConfirmation = (medium: TradeMediums, hash: string, confirmations: number) => {
  return Effect.gen(function* (_) {
    const errorCountRef = yield* _(Ref.make(0));
    const activeRef = yield* _(Ref.make(false));
    yield* _(
      Effect.repeat(
        Effect.gen(function* (_) {
          const hashEither = yield* _(Effect.either(container.api.crypto.getHashInfo(medium, hash)));
          if (Either.isRight(hashEither)) {
            Effect.runSync(Ref.set(errorCountRef, 0));
            if (hashEither.right.data.confirmations >= confirmations) {
              yield* _(Ref.set(activeRef, false));
            }
          } else {
            const count = Effect.runSync(Ref.updateAndGet(errorCountRef, (count) => count + 1));
            if (count >= 5) {
              yield* _(Effect.fail(hashEither.left));
            }
          }
        }),
        Schedule.compose(
          Schedule.spaced(
            medium === TradeMediums.Bitcoin
              ? "2 minutes"
              : medium === TradeMediums.Ethereum
              ? "30 seconds"
              : "60 seconds"
          ),
          Schedule.recurWhile(() => Effect.runSync(Ref.get(activeRef)))
        )
      )
    );
  });
};
