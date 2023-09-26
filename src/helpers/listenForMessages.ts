import type { GuildTextBasedChannel, Message, MessageCollectorOptions } from "discord.js";
import { Effect } from "effect";

export function listenForMessages(
  channel: GuildTextBasedChannel,
  onMessage: (ctx: { received: Message; endListener: Effect.Effect<never, never, void> }) => Promise<void> | void,
  options?: MessageCollectorOptions
) {
  return Effect.async<never, never, Message>((resume) => {
    const collector = channel
      .createMessageCollector(options)
      .on("collect", async (message) => {
        // await Effect.runPromiseExit(
        onMessage({
          received: message,
          endListener: Effect.sync(() => {
            collector.stop();
            return resume(Effect.succeed(message));
          }),
        });
        // );
      })
      .on("end", () => {
        /* silently ignore */
      });
  });
}
