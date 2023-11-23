import type { TextChannel, Message, MessageCollectorOptions } from "discord.js";
import { Effect } from "effect";

export enum MessageCollectorEndReason {
  "time",
  "idle",
  "limit",
  "processedLimit",
  "channelDelete",
  "threadDelete",
  "guildDelete",
}

export function listenForMessages(
  channel: TextChannel,
  onMessage: (ctx: {
    received: Message;
    endListener: Effect.Effect<never, never, void>;
  }) => Effect.Effect<never, unknown, unknown>,
  options?: MessageCollectorOptions
) {
  return Effect.async<never, MessageCollectorEndReason, Message>((resume) => {
    const collector = channel
      .createMessageCollector(options)
      .on("collect", async (message) => {
        await Effect.runPromiseExit(
          onMessage({
            received: message,
            endListener: Effect.sync(() => {
              collector.stop();
              return resume(Effect.succeed(message));
            }),
          })
        );
      })
      .on("end", (_, reason) => {
        // This means that the collector was stopped by the endListener function
        if (reason === "user") return;
        return resume(Effect.fail(reason as unknown as MessageCollectorEndReason));
      });
  });
}
