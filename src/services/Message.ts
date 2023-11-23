import type { EmojiIdentifierResolvable, Message, MessageEditOptions } from "discord.js";
import { DiscordAPIError, type TextChannel, type MessageCreateOptions, type MessagePayload } from "discord.js";
import { Effect } from "effect";
import type { DurationInput } from "effect/Duration";

import { MessageServiceError } from "@/src/errors/MessageServiceError";

export class MessageService {
  static send(channel: TextChannel, data: string | MessagePayload | MessageCreateOptions, timeout?: DurationInput) {
    return Effect.gen(function* (_) {
      if (timeout) yield* _(Effect.sleep(timeout));
      return yield* _(
        Effect.tryPromise({
          try: () => channel.send(data),
          catch: (unknown) => {
            if (unknown instanceof DiscordAPIError) {
              return new MessageServiceError(unknown.message, "send");
            } else {
              return new MessageServiceError(unknown, "send");
            }
          },
        })
      );
    });
  }

  static edit(message: Message, data: string | MessagePayload | MessageEditOptions) {
    return Effect.tryPromise({
      try: () => message.edit(data),
      catch: (unknown) => {
        if (unknown instanceof DiscordAPIError) {
          return new MessageServiceError(unknown.message, "edit");
        } else {
          return new MessageServiceError(unknown, "edit");
        }
      },
    });
  }

  static delete(message: Message, timeout?: DurationInput) {
    return Effect.gen(function* (_) {
      if (timeout) yield* _(Effect.sleep(timeout));
      if (message.deletable) {
        yield* _(
          Effect.tryPromise({
            try: () => message.delete(),
            catch: (unknown) => {
              if (unknown instanceof DiscordAPIError) {
                return new MessageServiceError(unknown.message, "delete");
              } else {
                return new MessageServiceError(unknown, "delete");
              }
            },
          })
        );
      }
    });
  }

  static batchDelete(messages: Message[], timeout?: DurationInput) {
    return Effect.forEach(messages, (message) => MessageService.delete(message, timeout), { concurrency: "unbounded" });
  }

  static reply(message: Message, data: string | MessagePayload | MessageCreateOptions) {
    return Effect.tryPromise({
      try: () => message.reply(data),
      catch: (unknown) => {
        if (unknown instanceof DiscordAPIError) {
          return new MessageServiceError(unknown.message, "reply");
        } else {
          return new MessageServiceError(unknown, "reply");
        }
      },
    });
  }

  static react(message: Message, emoji: EmojiIdentifierResolvable) {
    return Effect.tryPromise({
      try: () => message.react(emoji),
      catch: (unknown) => {
        if (unknown instanceof DiscordAPIError) {
          return new MessageServiceError(unknown.message, "react");
        } else {
          return new MessageServiceError(unknown, "react");
        }
      },
    });
  }
}
