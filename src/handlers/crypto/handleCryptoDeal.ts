import { EmbedBuilder, channelMention, type GuildTextBasedChannel } from "discord.js";
import { Effect, Either } from "effect";

import type { TradeMediums } from "@/src/config";
import { EmbedColors, TradeParties } from "@/src/config";
import { handleDealConfirmation } from "@/src/handlers/core/handleDealConfirmation";
import handleIdentification from "@/src/handlers/core/handleIdentification";
import handleAddressCollection from "@/src/handlers/crypto/handleAddressCollection";
import { handleAddressGeneration } from "@/src/handlers/crypto/handleAddressGeneration";
import { handleAmountSelection } from "@/src/handlers/crypto/handleAmountSelection";
import { handleDeposit } from "@/src/handlers/crypto/handleDeposit";
import handleRelease from "@/src/handlers/crypto/handleRelease";
import { MemberService } from "@/src/helpers/services/Member";
import { MessageService } from "@/src/helpers/services/Message";

export default function handleCrypto(channel: GuildTextBasedChannel, medium: TradeMediums) {
  return Effect.either(
    Effect.gen(function* (_) {
      const identification = yield* _(handleIdentification(channel, medium));
      const amount = yield* _(handleAmountSelection(channel, identification, medium));
      const address = yield* _(handleAddressGeneration(channel, identification, medium));
      yield* _(handleDeposit(channel, identification, medium, amount, address));
      const verdict = yield* _(handleDealConfirmation(channel, identification, medium));
      if (verdict === "RELEASE") {
        const toAddress = yield* _(handleAddressCollection(channel, identification, medium, TradeParties.Receiver));
        const releaseEither = yield* _(
          Effect.either(handleRelease(channel, identification, TradeParties.Receiver, medium, address, toAddress))
        );
        if (Either.isRight(releaseEither)) {
          yield* _(
            MessageService.send(channel, {
              content: identification.all.mention,
              embeds: [
                new EmbedBuilder()
                  .setTitle("Don't forget to vouch")
                  .setDescription(
                    `We hope you loved using our service. Please leave a vouch in ${channelMention(
                      process.env.VOUCH_CHANNEL_ID ?? ""
                    )} to help us grow!`
                  )
                  .setColor(EmbedColors.Main),
              ],
            })
          );
          yield* _(
            Effect.forEach([identification.SENDER.id, identification.RECEIVER.id], (id) =>
              MemberService.addRole(channel.guild, process.env.CLIENT_ROLE_ID ?? "", id)
            )
          );
        }
      } else if (verdict === "RETURN") {
        const toAddress = yield* _(handleAddressCollection(channel, identification, medium, TradeParties.Sender));
        yield* _(handleRelease(channel, identification, TradeParties.Sender, medium, address, toAddress));
      }
    })
  );
}
