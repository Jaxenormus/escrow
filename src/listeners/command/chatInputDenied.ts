import type { ChatInputCommandDeniedPayload, UserError } from "@sapphire/framework";
import { Listener } from "@sapphire/framework";

export default class ChatInputCommandDeniedListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "chatInputCommandDenied",
    });
  }

  public run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
    return interaction.reply(error.message);
  }
}
