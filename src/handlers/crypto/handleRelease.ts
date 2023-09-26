import type { Address } from "@prisma/client";
import { container } from "@sapphire/framework";
import type { GuildTextBasedChannel } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, codeBlock } from "discord.js";
import { Effect, Either } from "effect";
import { toLower } from "lodash";

import { CryptoConfirmations, EmbedColors, type TradeParties } from "@/src/config";
import type { TradeMediums } from "@/src/config";
import type { Identification } from "@/src/handlers/core/handleIdentification";
import { findHashUrl } from "@/src/helpers/crypto/findHashUrl";
import { waitForConfirmation } from "@/src/helpers/crypto/waitForConfirmation";
import { MessageService } from "@/src/helpers/services/Message";

export default function handleRelease(
  channel: GuildTextBasedChannel,
  ids: Identification,
  party: TradeParties,
  medium: TradeMediums,
  address: Address,
  destination: string
) {
  return Effect.gen(function* (_) {
    const hashEither = yield* _(Effect.either(container.api.crypto.releaseHeldCrypto(medium, address, destination)));
    if (Either.isRight(hashEither)) {
      const message = yield* _(
        MessageService.send(channel, {
          embeds: [
            new EmbedBuilder()
              .setTitle(`${medium} released and awaiting ${CryptoConfirmations[medium]} confirmation(s)`)
              .setDescription(
                `Your funds have been released successfully and are awaiting confirmation. This may take a few minutes`
              )
              .setColor(EmbedColors.Success)
              .setThumbnail(container.assets.crypto[medium].confirmed.name),
          ],
          files: [container.assets.crypto[medium].confirmed.attachment],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel("View Transaction")
                .setStyle(ButtonStyle.Link)
                .setURL(findHashUrl(medium, hashEither.right))
            ),
          ],
        })
      );
      yield* _(waitForConfirmation(medium, hashEither.right, CryptoConfirmations[medium]));
      yield* _(MessageService.delete(message));
      yield* _(
        MessageService.send(channel, {
          content: ids[party].mention,
          embeds: [
            new EmbedBuilder()
              .setTitle(`${medium} released and confirmed`)
              .setDescription(`Your funds have been released successfully and confirmed.`)
              .setColor(EmbedColors.Success)
              .setThumbnail(container.assets.crypto[medium].confirmed.name),
          ],
          files: [container.assets.crypto[medium].confirmed.attachment],
          components: message.components,
        })
      );
    } else {
      yield* _(
        MessageService.send(channel, {
          content: ids[party].mention,
          embeds: [
            new EmbedBuilder()
              .setTitle(`${medium} release failed`)
              .setDescription(
                `An error occurred while attempting to release your ${toLower(
                  medium
                )}. Please contact a staff member for help.\n${codeBlock(hashEither.left.message)}`
              )
              .setColor(EmbedColors.Error)
              .setThumbnail(container.assets.crypto[medium].failed.name),
          ],
          files: [container.assets.crypto[medium].failed.attachment],
        })
      );
    }
  });
}
