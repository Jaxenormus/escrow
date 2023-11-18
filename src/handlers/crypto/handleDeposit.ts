import type { Address } from "@prisma/client";
import { container } from "@sapphire/pieces";
import type { TextChannel, Message } from "discord.js";
import { ButtonBuilder, ButtonStyle, codeBlock } from "discord.js";
import { ActionRowBuilder, EmbedBuilder, hyperlink } from "discord.js";
import { Effect, Either, Option, Ref, Schedule, pipe } from "effect";
import { toString } from "lodash";

import { TradeMediums } from "@/src/config";
import { CryptoConfirmations, EmbedColors, TradeParties } from "@/src/config";
import type { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";
import { PrematureTerminationError } from "@/src/errors/PrematureTermination";
import type { Identification } from "@/src/handlers/core/handleIdentification";
import handleAddressCollection from "@/src/handlers/crypto/handleAddressCollection";
import type { CryptoDealAmount } from "@/src/handlers/crypto/handleAmountSelection";
import { findAddressUrl } from "@/src/helpers/crypto/findAddressUrl";
import { findHashUrl } from "@/src/helpers/crypto/findHashUrl";
import { validateHash } from "@/src/helpers/crypto/validateHash";
import { waitForConfirmation } from "@/src/helpers/crypto/waitForConfirmation";
import { fiatFormat } from "@/src/helpers/fiatFormat";
import { promptQuestion } from "@/src/helpers/promptQuestion";
import { clearInactivityTasks } from "@/src/helpers/tasks/clearInactivityTasks";
import { MessageService } from "@/src/services/Message";

export const handleDeposit = (
  channel: TextChannel,
  ids: Identification,
  medium: TradeMediums,
  amount: CryptoDealAmount,
  address: Address,
  ignoredHashes: string[] = []
): Effect.Effect<never, ExpectedExecutionError | Error, void> => {
  return Effect.gen(function* (_) {
    const mediumAssets = container.assets.crypto[medium];
    const sendCoinMessage = yield* _(
      MessageService.send(channel, {
        content: ids.SENDER.mention,
        embeds: [
          new EmbedBuilder()
            .setTitle(`Send your ${medium} as part of the trade.`)
            .setDescription(
              `The bot will automatically detect the transaction and wait for ${CryptoConfirmations[medium]} confirmation(s).`
            )
            .addFields([
              {
                name: `Address`,
                value: hyperlink(
                  medium === TradeMediums.Ethereum ? `0x${address.data}` : address.data,
                  findAddressUrl(medium, address.data)
                ),
              },
              { name: `Amount`, value: `${amount.crypto} (${amount.fiat})` },
            ])

            .setColor(EmbedColors.Loading)
            .setThumbnail(mediumAssets.pending.name),
          new EmbedBuilder({
            title: "⚠️ Escrow Automated Middleman Warning",
            description:
              "The bot will **NEVER** ask you to send funds to an address that is not listed above. If you are asked to send funds to an address that is not listed above, please ping a staff member immediately.",
            color: EmbedColors.Error,
          }),
        ],
        files: [mediumAssets.pending.attachment],
      })
    );

    const copyToClipboardMessages = yield* _(
      Effect.forEach(
        [medium === TradeMediums.Ethereum ? `0x${address.data}` : address.data, amount.crypto],
        (content) => MessageService.send(channel, content)
      )
    );

    const activeRef = yield* _(Ref.make(true));
    const rawAmountReceivedRef = yield* _(Ref.make(fiatFormat(0)));
    const transactionHashRef = yield* _(Ref.make(""));
    const transactionStatusRef = yield* _(Ref.make(""));

    const callback = () => Effect.runSync(Ref.set(activeRef, false));
    container.events.ticket.on(channel.id, callback);

    yield* _(
      Effect.repeat(
        Effect.gen(function* (_) {
          const addressEither = yield* _(Effect.either(container.api.crypto.getFullAddressInfo(medium, address.data)));
          if (Either.isRight(addressEither)) {
            const transactionOption = yield* _(
              pipe(
                Effect.succeed(addressEither.right.data.txs),
                Effect.flatMap((txs) =>
                  Effect.findFirst(txs, (t) =>
                    Effect.succeed(
                      t.addresses.filter((a) => a.includes(address.data)).length > 0 && !ignoredHashes.includes(t.hash)
                    )
                  )
                )
              )
            );
            if (Option.isSome(transactionOption)) {
              const result = yield* _(validateHash(medium, address.data, amount, transactionOption.value.hash));
              yield* _(
                Effect.all([
                  Ref.set(activeRef, false),
                  Ref.set(rawAmountReceivedRef, result.rawReceived),
                  Ref.set(transactionHashRef, transactionOption.value.hash),
                  Ref.set(transactionStatusRef, result.status),
                ])
              );
            }
          }
        }),
        Schedule.compose(
          Schedule.spaced("30 seconds"),
          Schedule.recurWhile(() => Effect.runSync(Ref.get(activeRef)))
        )
      )
    );

    container.events.ticket.off(channel.id, callback);
    yield* _(clearInactivityTasks(channel));

    const rawAmountReceived = yield* _(Ref.get(rawAmountReceivedRef));
    const transactionHash = yield* _(Ref.get(transactionHashRef));
    const transactionStatus = yield* _(Ref.get(transactionStatusRef));

    const messagesToDeleteRef = yield* _(Ref.make<Message[]>([]));

    const fiatValue = yield* _(container.api.crypto.calculateFiatValue(rawAmountReceived, medium));
    const formattedAmountReceived = fiatFormat(fiatValue.data.data[0].quote["USD"].price);

    const waitForConfirmationEmbed = new EmbedBuilder()
      .setTitle("Please wait for the transaction to confirm.")
      .setDescription(
        "A valid transaction has been detected but not yet confirmed. Please wait before proceeding with your exchange."
      )
      .addFields([
        { name: "Hash", value: hyperlink(transactionHash, findHashUrl(medium, transactionHash)) },
        { name: "Required Confirmations", value: toString(CryptoConfirmations[medium]), inline: true },
        { name: "Expected Amount", value: formattedAmountReceived, inline: true },
      ])
      .setColor(EmbedColors.Loading)
      .setThumbnail(mediumAssets.pending.name);

    if (transactionStatus === "VALID") {
      const waitForConfirmationMessage = yield* _(
        MessageService.send(channel, {
          embeds: [waitForConfirmationEmbed],
          files: [mediumAssets.pending.attachment],
        })
      );
      yield* _(Ref.update(messagesToDeleteRef, (messages) => [...messages, waitForConfirmationMessage]));
    } else if (transactionStatus === "UNDER_PAID") {
      const [underValueMessage, { consensus, message }] = yield* _(
        Effect.all([
          MessageService.send(channel, {
            embeds: [
              new EmbedBuilder()
                .setTitle("Under value transaction has been detected.")
                .setDescription("This transaction has been detected but is less than 98% of the amount required.")
                .addFields([
                  {
                    name: "Hash",
                    value: hyperlink(transactionHash, findHashUrl(medium, transactionHash)),
                  },
                ])
                .setColor(EmbedColors.Error)
                .setThumbnail(mediumAssets.trend.down.name),
            ],
            files: [mediumAssets.trend.down.attachment],
          }),
          promptQuestion(
            channel,
            {
              content: ids.RECEIVER.mention,
              embeds: [
                new EmbedBuilder()
                  .setTitle("Would you like to accept this lower amount?")
                  .setDescription(
                    `The sender has sent less than 98% of the required amount. If you accept this transaction, ${ids.SENDER.mention} can still send the remaining amount to the bot if desired. Selecting deny will cancel the trade and refund the sender.`
                  )
                  .addFields([
                    { name: "Amount Expected ", value: `${amount.fiat}`, inline: true },
                    { name: "Amount Received ", value: formattedAmountReceived, inline: true },
                  ])
                  .setColor(EmbedColors.Loading),
              ],
            },
            [ids.RECEIVER.id],
            { confirm: "Accept lower amount", deny: "Deny lower amount" },
            { dangerousActions: true }
          ),
        ])
      );
      yield* _(MessageService.batchDelete([message, underValueMessage]));
      if (consensus) {
        const [, waitForConfirmationMessage] = yield* _(
          Effect.all([
            MessageService.send(channel, {
              content: ids.SENDER.mention,
              embeds: [
                new EmbedBuilder()
                  .setTitle("Transaction has been accepted.")
                  .setDescription("The receiver has accepted your transaction despite being under the required amount.")
                  .setFields(message.embeds[0].fields)
                  .setColor(EmbedColors.Success)
                  .setThumbnail(mediumAssets.confirmed.name),
              ],
              files: [mediumAssets.confirmed.attachment],
            }),
            MessageService.send(channel, {
              embeds: [waitForConfirmationEmbed],
              files: [mediumAssets.pending.attachment],
            }),
          ])
        );
        yield* _(Ref.update(messagesToDeleteRef, (messages) => [...messages, waitForConfirmationMessage]));
      } else {
        yield* _(
          MessageService.send(channel, {
            content: ids.SENDER.mention,
            embeds: [
              new EmbedBuilder()
                .setTitle("Transaction has been denied.")
                .setDescription("The receiver has denied your transaction because it was under the required amount.")
                .setFields(message.embeds[0].fields)
                .setColor(EmbedColors.Error)
                .setThumbnail(mediumAssets.failed.name),
            ],
            files: [mediumAssets.failed.attachment],
          })
        );
        const senderAddress = yield* _(handleAddressCollection(channel, ids, medium, TradeParties.Sender));
        const hashEither = yield* _(
          Effect.either(container.api.crypto.releaseHeldCrypto(medium, address, senderAddress))
        );
        if (Either.isRight(hashEither)) {
          yield* _(
            MessageService.send(channel, {
              content: ids.SENDER.mention,
              embeds: [
                new EmbedBuilder()
                  .setTitle(`${medium} has been returned to the sender`)
                  .setDescription(
                    `The ${medium} has been returned to the sender because the receiver denied the transaction.`
                  )
                  .setColor(EmbedColors.Success)
                  .setThumbnail(mediumAssets.returned.name),
              ],
              files: [mediumAssets.returned.attachment],
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
          yield* _(Effect.fail(new PrematureTerminationError()));
        } else {
          yield* _(
            MessageService.send(channel, {
              content: ids.SENDER.mention,
              embeds: [
                new EmbedBuilder()
                  .setTitle(`Failed to return the ${medium} to the sender`)
                  .setDescription(
                    `The bot failed to release the ${medium} to the sender. Please contact a staff member to resolve this issue.\n${codeBlock(
                      toString(hashEither.left.error)
                    )}`
                  )
                  .setColor(EmbedColors.Error),
              ],
            })
          );
        }
        yield* _(Effect.fail(new PrematureTerminationError()));
      }
    }

    const confirmationEither = yield* _(
      Effect.either(waitForConfirmation(channel, medium, transactionHash, CryptoConfirmations[medium]))
    );

    if (Either.isRight(confirmationEither)) {
      yield* _(pipe(Ref.get(messagesToDeleteRef), Effect.flatMap(MessageService.batchDelete)));
      const hash = yield* _(container.api.crypto.getHashInfo(medium, transactionHash));
      yield* _(
        MessageService.send(channel, {
          content: ids.SENDER.mention,
          embeds: [
            new EmbedBuilder()
              .setTitle("Payment has been received.")
              .setDescription("The payment has been received and reached the required amount of confirmations.")
              .addFields([
                { name: "Confirmations Reached", value: hash.data.confirmations.toString(), inline: true },
                { name: "Amount Received ", value: formattedAmountReceived, inline: true },
              ])
              .setColor(EmbedColors.Success)
              .setThumbnail(mediumAssets.confirmed.name),
          ],
          files: [mediumAssets.confirmed.attachment],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel("View Transaction")
                .setStyle(ButtonStyle.Link)
                .setURL(findHashUrl(medium, transactionHash))
            ),
          ],
        })
      );
    } else {
      yield* _(
        Ref.update(messagesToDeleteRef, (messages) => [...messages, ...copyToClipboardMessages, sendCoinMessage])
      );
      yield* _(pipe(Ref.get(messagesToDeleteRef), Effect.flatMap(MessageService.batchDelete)));
      yield* _(
        MessageService.send(channel, {
          content: ids.SENDER.mention,
          embeds: [
            new EmbedBuilder()
              .setTitle("Failed to validate transaction")
              .setDescription(
                "The transaction the bot previously detected has failed to validate. This is most likely due to the transaction being replaced or double spent. Please resend the transaction or contact a staff member for assistance."
              )
              .setColor(EmbedColors.Error)
              .setThumbnail(mediumAssets.failed.name),
          ],
          files: [mediumAssets.failed.attachment],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel("View Transaction")
                .setStyle(ButtonStyle.Link)
                .setURL(findHashUrl(medium, transactionHash))
            ),
          ],
        })
      );
      return yield* _(handleDeposit(channel, ids, medium, amount, address, [...ignoredHashes, transactionHash]));
    }
  });
};
