import { type GuildTextBasedChannel } from "discord.js";
import { Effect } from "effect";

import type { TradeMediums } from "@/src/config";
import { TradeParties } from "@/src/config";
import { handleDealConfirmation } from "@/src/handlers/core/handleDealConfirmation";
import handleIdentification from "@/src/handlers/core/handleIdentification";
import handleAddressCollection from "@/src/handlers/crypto/handleAddressCollection";
import { handleAddressGeneration } from "@/src/handlers/crypto/handleAddressGeneration";
import { handleAmountSelection } from "@/src/handlers/crypto/handleAmountSelection";
import { handleDeposit } from "@/src/handlers/crypto/handleDeposit";
import handleRelease from "@/src/handlers/crypto/handleRelease";

export default function handleCrypto(channel: GuildTextBasedChannel, medium: TradeMediums) {
  return Effect.either(
    Effect.gen(function* (_) {
      const identification = yield* _(handleIdentification(channel, medium));
      // yield* _(handleAddressCollection(channel, identification, medium, TradeParties.Sender));
      // yield* _(
      //   container.db.createTicket({
      //     id: channel.id,
      //     medium,
      //     metadata: {},
      //     sender: {
      //       connectOrCreate: {
      //         where: { id: identification.SENDER.id },
      //         create: { id: identification.SENDER.id, metadata: {} },
      //       },
      //     },
      //     receiver: {
      //       connectOrCreate: {
      //         where: { id: identification.RECEIVER.id },
      //         create: { id: identification.RECEIVER.id, metadata: {} },
      //       },
      //     },
      //   })
      // );

      const amount = yield* _(handleAmountSelection(channel, identification, medium));
      const address = yield* _(handleAddressGeneration(channel, identification, medium));
      yield* _(handleDeposit(channel, identification, medium, amount, address));
      const verdict = yield* _(handleDealConfirmation(channel, identification, medium));
      const receiverAddress = yield* _(handleAddressCollection(channel, identification, medium, TradeParties.Receiver));
      if (verdict === "RELEASE") {
        yield* _(handleRelease(channel, identification, TradeParties.Receiver, medium, address, receiverAddress));
      } else if (verdict === "RETURN") {
        yield* _(handleRelease(channel, identification, TradeParties.Sender, medium, address, receiverAddress));
      }
    })
  );
}
