import { container } from "@sapphire/pieces";
import { type TextChannel } from "discord.js";
import { Effect, Either } from "effect";

import type { TradeMediums } from "@/src/config";
import { TradeParties } from "@/src/config";
import { handleDealCompletion } from "@/src/handlers/core/handleDealCompletion";
import { handleDealConfirmation } from "@/src/handlers/core/handleDealConfirmation";
import handleIdentification from "@/src/handlers/core/handleIdentification";
import handleAddressCollection from "@/src/handlers/crypto/handleAddressCollection";
import { handleAddressGeneration } from "@/src/handlers/crypto/handleAddressGeneration";
import { handleAmountSelection } from "@/src/handlers/crypto/handleAmountSelection";
import { handleDeposit } from "@/src/handlers/crypto/handleDeposit";
import handleRelease from "@/src/handlers/crypto/handleRelease";

export default function handleCrypto(channel: TextChannel, medium: TradeMediums) {
  return Effect.either(
    Effect.gen(function* (_) {
      const identification = yield* _(handleIdentification(channel, medium));
      yield* _(container.api.statistics.trackTicketAction(channel, medium, "role-selection"));
      const amount = yield* _(handleAmountSelection(channel, identification, medium));
      yield* _(container.api.statistics.trackTicketAction(channel, medium, "amount-selection"));
      const address = yield* _(handleAddressGeneration(channel, identification, medium));
      yield* _(handleDeposit(channel, identification, medium, amount, address));
      yield* _(container.api.statistics.trackCrypto(channel, medium, amount));
      const verdict = yield* _(handleDealConfirmation(channel, identification, medium));
      if (verdict === "RELEASE" || verdict === "RETURN") {
        const releaseParty = verdict === "RELEASE" ? TradeParties.Receiver : TradeParties.Sender;
        const releaseAddress = yield* _(handleAddressCollection(channel, identification, medium, releaseParty));
        const releaseEither = yield* _(
          Effect.either(handleRelease(channel, identification, releaseParty, medium, address, releaseAddress))
        );
        if (Either.isRight(releaseEither)) yield* _(handleDealCompletion(channel, identification));
      }
    })
  );
}
