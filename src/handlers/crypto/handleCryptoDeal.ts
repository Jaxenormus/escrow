import { container } from "@sapphire/pieces";
import { type TextChannel } from "discord.js";
import { Effect, Either, pipe } from "effect";

import type { TradeMediums } from "@/src/config";
import { TradeParties } from "@/src/config";
import { handleDealConfirmation } from "@/src/handlers/core/handleDealConfirmation";
import handleIdentification from "@/src/handlers/core/handleIdentification";
import handleAddressCollection from "@/src/handlers/crypto/handleAddressCollection";
import { handleAddressGeneration } from "@/src/handlers/crypto/handleAddressGeneration";
import { handleAmountSelection } from "@/src/handlers/crypto/handleAmountSelection";
import { handleDeposit } from "@/src/handlers/crypto/handleDeposit";
import handleRelease from "@/src/handlers/crypto/handleRelease";
import { MemberService } from "@/src/services/Member";
import { MessageService } from "@/src/services/Message";

export default function handleCrypto(channel: TextChannel, medium: TradeMediums) {
  return Effect.either(
    Effect.gen(function* (_) {
      const ids = yield* _(handleIdentification(channel, medium));
      yield* _(container.api.statistics.trackTicketAction(channel, medium, "role-selection"));
      const amount = yield* _(handleAmountSelection(channel, ids, medium));
      yield* _(container.api.statistics.trackTicketAction(channel, medium, "amount-selection"));
      const address = yield* _(handleAddressGeneration(channel, ids, medium));
      yield* _(handleDeposit(channel, ids, medium, amount, address));
      yield* _(
        Effect.all(
          [
            container.api.statistics.trackCrypto(channel, medium, amount),
            Effect.either(
              pipe(
                ids.all.id,
                Effect.forEach((id) => MemberService.addRole(channel.guild, process.env.CLIENT_ROLE_ID ?? "", id))
              )
            ),
          ],
          { concurrency: "unbounded" }
        )
      );
      const verdict = yield* _(handleDealConfirmation(channel, ids, medium));
      if (verdict === "RELEASE" || verdict === "RETURN") {
        const toParty = verdict === "RELEASE" ? TradeParties.Receiver : TradeParties.Sender;
        const toAddress = yield* _(handleAddressCollection(channel, ids, medium, toParty));
        const releaseEither = yield* _(Effect.either(handleRelease(channel, ids, toParty, medium, address, toAddress)));
        if (Either.isRight(releaseEither)) yield* _(MessageService.send(channel as TextChannel, "$close", "2 minutes"));
      }
    })
  );
}
