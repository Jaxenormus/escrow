import type { TextChannel} from "discord.js";
import { EmbedBuilder, channelMention } from "discord.js";
import { Effect } from "effect";

import { EmbedColors } from "@/src/config";
import type { Identification } from "@/src/handlers/core/handleIdentification";
import { ChannelService } from "@/src/helpers/services/Channel";
import { MemberService } from "@/src/helpers/services/Member";
import { MessageService } from "@/src/helpers/services/Message";

export const handleDealCompletion = (
  channel: TextChannel,
  identification: Identification
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
    yield* _(
      Effect.forEach([identification.SENDER.id, identification.RECEIVER.id], (id) =>
        MemberService.addRole(channel.guild, process.env.CLIENT_ROLE_ID ?? "", id)
      )
    );
    yield* _(ChannelService.delete(channel as TextChannel, "5 minutes"));
  });
};
