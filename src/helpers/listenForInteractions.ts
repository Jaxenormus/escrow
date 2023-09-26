import type {
  ButtonInteraction,
  Message,
  MessageCollectorOptionsParams,
  MessageComponentType,
  UserSelectMenuInteraction,
} from "discord.js";
import { Effect } from "effect";

function listenForInteractions<T extends MessageComponentType>(
  message: Message,
  onInteraction: (
    interaction: ButtonInteraction | UserSelectMenuInteraction,
    end: (returnValue?: T) => void
  ) => Effect.Effect<never, unknown, unknown>,
  { avoidUpdate, ...collectorOptions }: (MessageCollectorOptionsParams<T> & { avoidUpdate?: boolean }) | undefined = {}
) {
  return Effect.async<never, never, T | true>((resume) => {
    const collector = message
      .createMessageComponentCollector<T>(collectorOptions)
      .on("collect", async (i) => {
        if (!avoidUpdate) await i.deferUpdate();
        if (i.isButton() || i.isUserSelectMenu()) {
          await Effect.runPromiseExit(
            onInteraction(i, (returnValue?: T) => {
              collector.stop();
              return resume(Effect.succeed(returnValue ?? true));
            })
          );
        }
      })
      .on("end", () => {
        /* silently ignore */
      });
  });
}

export { listenForInteractions };
