import type { TextChannel } from "discord.js";
import { EmbedBuilder, channelMention } from "discord.js";
import { Effect } from "effect";

import { EmbedColors } from "@/src/config";
import type { Identification } from "@/src/handlers/core/handleIdentification";
import { MemberService } from "@/src/services/Member";
import { MessageService } from "@/src/services/Message";

export const handleDealCompletion = (
  channel: TextChannel,
  identification: Identification,
  administerRoles: boolean = true
): Effect.Effect<never, unknown, void> => {
  return Effect.gen(function* (_) {
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
    if (administerRoles) {
      yield* _(
        Effect.forEach([identification.SENDER.id, identification.RECEIVER.id], (id) =>
          MemberService.addRole(channel.guild, process.env.CLIENT_ROLE_ID ?? "", id)
        )
      );
    }
    yield* _(MessageService.send(channel as TextChannel, "$close", "2 minutes"));
  });
};
