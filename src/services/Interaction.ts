import type { ChatInputCommandInteraction, InteractionReplyOptions, MessageComponentInteraction } from "discord.js";
import { DiscordAPIError, type MessagePayload } from "discord.js";
import { Effect } from "effect";

import { InteractionServiceError } from "@/src/errors/InteractionServiceError";

export class InteractionService {
  static followUp(
    interaction: MessageComponentInteraction | ChatInputCommandInteraction,
    data: string | MessagePayload | InteractionReplyOptions
  ) {
    return Effect.tryPromise({
      try: () => interaction.followUp(data),
      catch: (unknown) => {
        if (unknown instanceof DiscordAPIError) {
          return new InteractionServiceError(unknown.message, "followUp");
        } else {
          return new InteractionServiceError(unknown, "followUp");
        }
      },
    });
  }
}
