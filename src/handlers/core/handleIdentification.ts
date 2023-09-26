import type { ComponentType, GuildTextBasedChannel } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, inlineCode, userMention } from "discord.js";
import { Effect, Ref } from "effect";

import type { TradeMediums } from "@/src/config";
import { EmbedColors, Interactions, TradeParties } from "@/src/config";
import type { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";
import { promptQuestion } from "@/src/helpers/promptQuestion";
import { InteractionService } from "@/src/helpers/services/Interaction";
import { MessageService } from "@/src/helpers/services/Message";
import AdminOnlyPrecondition from "@/src/preconditions/roles/adminOnly";

import { listenForInteractions } from "../../helpers/listenForInteractions";

export type Identification = {
  [TradeParties.Sender]: { id: string; mention: string };
  [TradeParties.Receiver]: { id: string; mention: string };
  all: { id: string[]; mention: string };
};

export default function handleIdentification(
  channel: GuildTextBasedChannel,
  medium: TradeMediums
): Effect.Effect<never, ExpectedExecutionError, Identification> {
  const identificationEmbed = new EmbedBuilder({
    title: "Trade Participant Identification",
    description:
      "Click the button that corresponds to your role in this trade to properly middleman it. Once both parties have decided on their roles, confirm your choices to proceed.",
    fields: [
      { name: `Sending ${medium}`, value: "`None`", inline: true },
      { name: `Receiving ${medium}`, value: "`None`", inline: true },
    ],
    color: EmbedColors.Main,
  });

  return Effect.gen(function* (_) {
    const senderRef = yield* _(Ref.make<string | null>(null));
    const receiverRef = yield* _(Ref.make<string | null>(null));
    const identificationMessage = yield* _(
      MessageService.send(channel, {
        embeds: [identificationEmbed],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel(`Sending ${medium}`)
              .setStyle(ButtonStyle.Secondary)
              .setCustomId(Interactions.PartyIdentificationSendingButton),
            new ButtonBuilder()
              .setLabel(`Receiving ${medium}`)
              .setStyle(ButtonStyle.Secondary)
              .setCustomId(Interactions.PartyIdentificationReceivingButton),
            new ButtonBuilder()
              .setLabel("Reset")
              .setStyle(ButtonStyle.Danger)
              .setCustomId(Interactions.PartyIdentificationResetButton)
          ),
        ],
      })
    );
    yield* _(
      listenForInteractions<ComponentType.Button>(identificationMessage, (interaction, end) =>
        Effect.gen(function* (_) {
          if (interaction.customId === Interactions.PartyIdentificationResetButton) {
            yield* _(Ref.update(senderRef, () => null));
            yield* _(Ref.update(receiverRef, () => null));
            yield* _(
              MessageService.edit(identificationMessage, {
                embeds: [
                  new EmbedBuilder(identificationMessage.embeds[0].data).setFields([
                    { name: `Sending ${medium}`, value: inlineCode("None"), inline: true },
                    { name: `Receiving ${medium}`, value: inlineCode("None"), inline: true },
                  ]),
                ],
              })
            );
          } else {
            const role =
              interaction.customId === Interactions.PartyIdentificationSendingButton
                ? TradeParties.Sender
                : TradeParties.Receiver;
            const isAdmin = AdminOnlyPrecondition.isAdmin(interaction.user.id);
            const sender = yield* _(Ref.get(senderRef));
            const receiver = yield* _(Ref.get(receiverRef));
            if ((sender === interaction.user.id || receiver === interaction.user.id) && !isAdmin) {
              yield* _(
                InteractionService.followUp(interaction, {
                  embeds: [
                    new EmbedBuilder({
                      description: "You have already selected a role for this trade.",
                      color: EmbedColors.Error,
                    }),
                  ],
                  ephemeral: true,
                })
              );
              return;
            } else {
              yield* _(Ref.set(role === TradeParties.Sender ? senderRef : receiverRef, interaction.user.id));
              const parties = yield* _(Effect.all([Ref.get(senderRef), Ref.get(receiverRef)]));
              yield* _(
                MessageService.edit(identificationMessage, {
                  embeds: [
                    new EmbedBuilder(identificationMessage.embeds[0].data).setFields([
                      {
                        name: `Sending ${medium}`,
                        value: parties[0] ? userMention(parties[0]) : inlineCode("None"),
                        inline: true,
                      },
                      {
                        name: `Receiving ${medium}`,
                        value: parties[1] ? userMention(parties[1]) : inlineCode("None"),
                        inline: true,
                      },
                    ]),
                  ],
                })
              );
            }
            const bothPartiesSelected = yield* _(Effect.all([Ref.get(senderRef), Ref.get(receiverRef)]));
            if (bothPartiesSelected.every((p) => p)) end();
          }
        })
      )
    );
    yield* _(MessageService.delete(identificationMessage));
    const parties = yield* _(Effect.all([Ref.get(senderRef), Ref.get(receiverRef)]));
    const { consensus, message } = yield* _(
      promptQuestion(
        channel,
        new EmbedBuilder(identificationMessage.embeds[0].data)
          .setTitle("Confirm role selection")
          .setDescription("Both parties have selected their roles. Are these correct?"),
        [parties[0] ?? "", parties[1] ?? ""],
        { confirm: "Yes", deny: "No" },
        { acknowledgeResponse: true }
      )
    );
    if (consensus) {
      yield* _(
        MessageService.edit(message, {
          embeds: [
            new EmbedBuilder(message.embeds[0].data)
              .setTitle("Identities Confirmed")
              .setDescription("Both parties have selected their roles and confirmed their choices")
              .setColor(EmbedColors.Success),
          ],
          components: [],
        })
      );
      return {
        [TradeParties.Sender]: { id: parties[0], mention: userMention(parties[0] ?? "") },
        [TradeParties.Receiver]: { id: parties[1], mention: userMention(parties[1] ?? "") },
        all: { id: parties, mention: parties.map((p) => userMention(p ?? "")).join(" ") },
      } as Identification;
    } else {
      yield* _(MessageService.delete(message));
      return yield* _(handleIdentification(channel, medium));
    }
  });
}
