import type { GuildTextBasedChannel } from "discord.js";
import { EmbedBuilder, userMention } from "discord.js";
import { Effect } from "effect";

import type { TradeMediums } from "@/src/config";
import { EmbedColors, SimplifiedTradeMediums } from "@/src/config";
import type { Identification } from "@/src/handlers/core/handleIdentification";
import { promptQuestion } from "@/src/helpers/promptQuestion";
import { MemberService } from "@/src/helpers/services/Member";
import { MessageService } from "@/src/helpers/services/Message";

type ConfirmationVerdict = "RELEASE" | "RETURN" | "CANCEL" | "RESTART";

export const handleDealConfirmation = (
  channel: GuildTextBasedChannel,
  ids: Identification,
  medium: TradeMediums
): Effect.Effect<never, unknown, ConfirmationVerdict> => {
  return Effect.gen(function* (_) {
    const confirmationQuestion = yield* _(
      promptQuestion(
        channel,
        {
          content: ids.all.mention,
          embeds: [
            new EmbedBuilder()
              .setTitle("You may proceed with your exchange")
              .setDescription(
                `${ids.RECEIVER.mention} you may now send whatever you agreed upon to ${ids.SENDER.mention}. Once the exchange is complete the sender must click the button below to finish the trade.`
              )
              .setColor(EmbedColors.Main),
          ],
        },
        [ids.SENDER.id],
        { confirm: `Release ${SimplifiedTradeMediums[medium]}`, deny: "Cancel Deal" },
        { dangerousActions: true, staffOverridable: true }
      )
    );
    let verdict = "RELEASE" as ConfirmationVerdict;
    const cancelledById =
      confirmationQuestion.overriddenBy ??
      Array.from(confirmationQuestion.confirmations.entries()).filter(([, value]) => !value)[0]?.[0];
    const cancelledByMember = yield* _(MemberService.fetch(channel.guild, cancelledById));
    if (!confirmationQuestion.consensus) {
      yield* _(MessageService.delete(confirmationQuestion.message));
      const { message: cancelMessage, confirmations } = yield* _(
        promptQuestion(
          channel,
          {
            content: ids.all.mention,
            embeds: [
              new EmbedBuilder()
                .setTitle("Are you sure you want to cancel this deal?")
                .setDescription(
                  `The deal has been canceled by ${userMention(
                    cancelledById
                  )}, and both parties must agree to these terms:`
                )
                .addFields([
                  {
                    name: "1. Acknowledge that this action is irreversible",
                    value: "I understand that this deal is being cancelled and will not be able to be undone",
                  },
                  {
                    name: "2. Acknowledge nothing has been exchanged",
                    value: "That no item, product, services, or anything has been exchanged",
                  },
                  {
                    name: `3. Acknowledge the ${medium} will be returned`,
                    value: `I understand that ${ids.SENDER.mention} will receive a refund without a staff member confirmation`,
                  },
                ])
                .setColor(EmbedColors.Loading)
                .setThumbnail(cancelledByMember.displayAvatarURL({ size: 128, extension: "png" })),
            ],
          },
          ids.all.id,
          { confirm: "Yes", deny: "No" },
          { dangerousActions: true, staffOverridable: true, acknowledgeResponse: true }
        )
      );
      const values = Array.from(confirmations.values());
      if (values.every((value) => value)) verdict = "RETURN";
      else if (values.every((value) => !value)) verdict = "RESTART";
      else if (values.some((value) => value)) verdict = "CANCEL";
      yield* _(MessageService.delete(cancelMessage));
    }
    if (verdict === "RELEASE") {
      yield* _(MessageService.delete(confirmationQuestion.message));
      const { message: secondaryMessage, consensus: secondaryConsensus } = yield* _(
        promptQuestion(
          channel,
          {
            content: ids.SENDER.mention,
            embeds: [
              new EmbedBuilder()
                .setTitle("Are you sure this deal is complete?")
                .setDescription(
                  `By continuing, you acknowledge that you have received the agreed upon payment and that you are ready to release the ${medium} to ${ids.RECEIVER.mention}.`
                )
                .setColor(EmbedColors.Loading),
            ],
          },
          [ids.SENDER.id],
          { confirm: "Yes", deny: "No" },
          { dangerousActions: true, staffOverridable: true }
        )
      );
      yield* _(MessageService.delete(secondaryMessage));
      verdict = secondaryConsensus ? "RELEASE" : "RESTART";
      if (verdict === "RELEASE") {
        yield* _(
          MessageService.send(channel, {
            content: ids.RECEIVER.mention,
            embeds: [
              new EmbedBuilder()
                .setTitle("Deal has been marked as complete")
                .setDescription(`Follow the instructions below to receive your ${SimplifiedTradeMediums[medium]}`)
                .setColor(EmbedColors.Success),
            ],
          })
        );
      }
    } else if (verdict === "CANCEL" || verdict === "RETURN") {
      yield* _(
        MessageService.send(channel, {
          content: verdict === "CANCEL" ? ids.all.mention : ids.SENDER.mention,
          embeds: [
            new EmbedBuilder()
              .setTitle("This deal has been cancelled")
              .setDescription(
                `${userMention(cancelledById)} has canceled this deal. ${
                  verdict === "CANCEL"
                    ? `Contact a staff member to help resolve and return the ${medium}`
                    : `Please follow the instructions when prompted to receive your refund`
                }`
              )
              .setColor(EmbedColors.Error)
              .setThumbnail(cancelledByMember.displayAvatarURL({ size: 128, extension: "png" })),
          ],
        })
      );
    }
    if (verdict !== "RESTART") return verdict;
    return yield* _(handleDealConfirmation(channel, ids, medium));
  });
};
