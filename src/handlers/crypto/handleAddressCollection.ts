import { container } from "@sapphire/framework";
import type { GuildTextBasedChannel } from "discord.js";
import { EmbedBuilder, hyperlink } from "discord.js";
import { Effect } from "effect";

import type { TradeMediums } from "@/src/config";
import type { TradeParties } from "@/src/config";
import { EmbedColors } from "@/src/config";
import type { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";
import type { Identification } from "@/src/handlers/core/handleIdentification";
import { findAddressUrl } from "@/src/helpers/crypto/findAddressUrl";
import { listenForMessages } from "@/src/helpers/listenForMessages";
import { promptQuestion } from "@/src/helpers/promptQuestion";
import { MessageService } from "@/src/helpers/services/Message";

export default function handleAddressCollection(
  channel: GuildTextBasedChannel,
  ids: Identification,
  medium: TradeMediums,
  party: TradeParties
): Effect.Effect<never, ExpectedExecutionError | Error, string> {
  return Effect.gen(function* (_) {
    const embedMessage = yield* _(
      MessageService.send(channel, {
        content: ids[party].mention,
        embeds: [
          new EmbedBuilder()
            .setTitle(`What is your ${medium} address?`)
            .setDescription(
              `To ensure that we send the ${medium} to the correct address, please provide your ${medium} address`
            )
            .setColor(EmbedColors.Main),
        ],
      })
    );
    const { content } = yield* _(
      listenForMessages(
        channel,
        async ({ received, endListener }) => {
          await Effect.runPromiseExit(
            Effect.match(container.api.crypto.getAddressInfo(medium, received.content), {
              onSuccess: async () => {
                await Effect.runPromiseExit(
                  Effect.all([MessageService.batchDelete([embedMessage, received]), endListener], {
                    concurrency: "unbounded",
                  })
                );
              },
              onFailure: async () => {
                await Effect.runPromiseExit(
                  Effect.gen(function* (_) {
                    const reply = yield* _(
                      MessageService.reply(
                        received,
                        `The address you provided is not a valid ${medium} address. Please try again.`
                      )
                    );
                    yield* _(MessageService.batchDelete([reply, received], "5 seconds"));
                  })
                );
              },
            })
          );
        },
        { filter: (message) => message.author.id === ids[party].id }
      )
    );
    const { consensus, message: confirmationMessage } = yield* _(
      promptQuestion(
        channel,
        {
          content: ids[party].mention,
          embeds: [
            new EmbedBuilder()
              .setTitle(`Is this your ${medium} address?`)
              .setDescription(
                "Insure that the address you put is correct, we will not be able to recover your funds if you send it too the wrong address."
              )
              .addFields([
                {
                  name: "Address",
                  value: hyperlink(content, findAddressUrl(medium, content)),
                },
              ])
              .setColor(EmbedColors.Loading),
          ],
        },
        [ids[party].id],
        { confirm: "Yes", deny: "No" }
      )
    );
    if (consensus) {
      yield* _(
        MessageService.edit(confirmationMessage, {
          embeds: [
            new EmbedBuilder()
              .setTitle(`${medium} address confirmed`)
              .setDescription(`This address has been confirmed by ${ids[party].mention}`)
              .setColor(EmbedColors.Success)
              .setFields(confirmationMessage.embeds[0].fields)
              .setThumbnail(container.assets.crypto[medium].confirmed.name),
          ],
          files: [container.assets.crypto[medium].confirmed.attachment],
          components: [],
        })
      );
      return content;
    } else {
      yield* _(MessageService.delete(confirmationMessage));
      return yield* _(handleAddressCollection(channel, ids, medium, party));
    }
  });
}
