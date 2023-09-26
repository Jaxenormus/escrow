import { container } from "@sapphire/framework";
import { Effect, Either, Option } from "effect";
import { toString } from "lodash";
import sb from "satoshi-bitcoin";
import web3 from "web3";

import { TradeMediums } from "@/src/config";
import type { CryptoDealAmount } from "@/src/handlers/crypto/handleAmountSelection";

export function validateHash(medium: TradeMediums, rawAddress: string, amount: CryptoDealAmount, hash: string) {
  return Effect.gen(function* (_) {
    const dataEither = yield* _(Effect.either(container.api.crypto.getHashInfo(medium, hash)));
    if (Either.isRight(dataEither)) {
      const outputOption = yield* _(
        Effect.findFirst(dataEither.right.data.outputs, (output) =>
          Effect.sync(() => output.addresses.filter((address) => address.includes(rawAddress)).length > 0)
        )
      );
      if (Option.isSome(outputOption)) {
        const validAmount =
          medium === TradeMediums.Ethereum
            ? parseInt(web3.utils.toWei(outputOption.value.value, "wei")) >=
              parseInt(web3.utils.toWei(amount.raw_crypto, "ether")) * 0.98
            : outputOption.value.value >= sb.toSatoshi(amount.crypto) * 0.98;

        const rawAmountReceived =
          medium === TradeMediums.Ethereum
            ? web3.utils.fromWei(outputOption.value.value, "ether")
            : sb.toBitcoin(outputOption.value.value);
        return yield* _(
          Effect.succeed({
            status: validAmount ? ("VALID" as const) : ("UNDER_PAID" as const),
            rawReceived: toString(rawAmountReceived),
          })
        );
      }
    }
    return yield* _(Effect.succeed({ status: "INVALID" as const, rawReceived: "0" }));
  });
}
