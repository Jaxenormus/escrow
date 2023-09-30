import { container } from "@sapphire/pieces";
import type { TextChannel } from "discord.js";
import { EmbedBuilder, codeBlock } from "discord.js";
import { Effect } from "effect";
import { isNil, toString } from "lodash";
import { parseFirst } from "price-parser";

import type { TradeMediums } from "@/src/config";
import { EmbedColors } from "@/src/config";
import type { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";
import type { Identification } from "@/src/handlers/core/handleIdentification";
import { fiatFormat } from "@/src/helpers/fiatFormat";
import { listenForMessages } from "@/src/helpers/listenForMessages";
import { promptQuestion } from "@/src/helpers/promptQuestion";
import { MessageService } from "@/src/helpers/services/Message";

export type CryptoDealAmount = { raw_crypto: number; crypto: string; raw_fiat: number; fiat: string };

export function handleAmountSelection(
  channel: TextChannel,
  ids: Identification,
  medium: TradeMediums
): Effect.Effect<never, ExpectedExecutionError, CryptoDealAmount> {
  return Effect.gen(function* (_) {
    const message = yield* _(
      MessageService.send(channel, {
        content: ids.RECEIVER.mention,
        embeds: [
          new EmbedBuilder()
            .setTitle(`What is the amount you want to receive in USD?`)
            .setDescription(
              `Please enter how much USD you would like to receive so that the amount of ${medium} ${ids.SENDER.mention} needs to send can be appropriately calculated.`
            )
            .setColor(EmbedColors.Loading),
        ],
      })
    );

    const { content: rawAmount } = yield* _(
      listenForMessages(channel, async ({ received, endListener }) => {
        await Effect.runPromiseExit(
          Effect.gen(function* (_) {
            if (received.author.id === ids.RECEIVER.id) {
              const input = parseFirst(`${received.content} USD`);
              if (isNil(input)) {
                const reply = yield* _(MessageService.reply(received, "Please enter a valid number."));
                yield* _(MessageService.batchDelete([reply, received], "5 seconds"));
              } else {
                yield* _(Effect.all([MessageService.delete(received), endListener], { concurrency: "unbounded" }));
              }
            }
          })
        );
      })
    );

    const amount = yield* _(
      Effect.succeed(
        parseFirst(`${rawAmount} USD`) as {
          currency: { code: string; symbols: string[]; name: string; exponent: number };
          currencyCode: string;
          floatValue: number;
          symbol: string;
          value: number;
        }
      )
    );

    yield* _(MessageService.delete(message));

    const { consensus, message: confirmationMessage } = yield* _(
      promptQuestion(
        channel,
        {
          content: ids.all.mention,
          embeds: [
            new EmbedBuilder()
              .setTitle("Is this information correct?")
              .setDescription("Make sure all the information below is correct before continuing.")
              .addFields([
                {
                  name: "USD Amount",
                  value: `${fiatFormat(amount.floatValue)}`,
                },
              ])
              .setColor(EmbedColors.Loading)
              .setFooter({ text: "Both parties must confirm this message to continue." }),
          ],
        },
        ids.all.id,
        { confirm: "Yes", deny: "No" },
        { acknowledgeResponse: true }
      )
    );

    if (consensus) {
      yield* _(
        MessageService.edit(confirmationMessage, {
          embeds: [
            new EmbedBuilder()
              .setTitle("Information Confirmed")
              .setDescription(`The following information has been confirmed by both parties`)
              .addFields(confirmationMessage.embeds[0].fields)
              .setColor(EmbedColors.Success),
          ],
          components: [],
        })
      );

      return yield* _(
        Effect.match(container.api.crypto.calculateCryptoValue(amount.floatValue, medium), {
          onSuccess(response) {
            return {
              raw_fiat: response.data.data[0].amount,
              fiat: fiatFormat(response.data.data[0].amount),
              raw_crypto: Object.values(response.data.data[0].quote)[0].price,
              crypto: Object.values(response.data.data[0].quote)[0].price.toFixed(8),
            } as CryptoDealAmount;
          },
          onFailure: (error) => {
            Effect.runPromiseExit(
              MessageService.send(channel, {
                embeds: [
                  new EmbedBuilder()
                    .setTitle("Failed to calculate crypto value")
                    .setDescription(
                      `An error occurred while trying to calculate the crypto value. Please try again.\n${codeBlock(
                        toString(error.error)
                      )}`
                    )
                    .setColor(EmbedColors.Error),
                ],
              })
            );
            return Effect.runSync(handleAmountSelection(channel, ids, medium));
          },
        })
      );
    } else {
      yield* _(MessageService.delete(confirmationMessage));
      return yield* _(handleAmountSelection(channel, ids, medium));
    }
  });
}
