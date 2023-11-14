import type { ChatInputCommandDeniedPayload, UserError } from "@sapphire/framework";
import { Listener } from "@sapphire/framework";
import { Effect } from "effect";

import { InteractionService } from "@/src/services/Interaction";

export default class ChatInputCommandDeniedListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "chatInputCommandDenied",
    });
  }

  public run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
    return Effect.runSync(
      Effect.gen(function* (_) {
        yield* _(InteractionService.followUp(interaction, { content: error.message }));
      })
    );
  }
}
