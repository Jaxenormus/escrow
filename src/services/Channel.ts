import type {
  GuildChannel,
  GuildChannelOverwriteOptions,
  TextChannel,
  PermissionOverwriteOptions,
  RoleResolvable,
  UserResolvable,
} from "discord.js";
import { DiscordAPIError } from "discord.js";
import { Effect } from "effect";
import type { DurationInput } from "effect/Duration";

import { ChannelServiceError } from "@/src/errors/ChannelServiceError";

export class ChannelService {
  static overridePermissions(
    channel: GuildChannel,
    userOrRole: RoleResolvable | UserResolvable,
    options: PermissionOverwriteOptions,
    overwriteOptions?: GuildChannelOverwriteOptions
  ) {
    return Effect.tryPromise({
      try: () => channel.permissionOverwrites.edit(userOrRole, options, overwriteOptions),
      catch: (unknown) => {
        if (unknown instanceof DiscordAPIError) {
          return new ChannelServiceError(unknown.message, "overridePermissions");
        } else {
          return new ChannelServiceError(unknown, "overridePermissions");
        }
      },
    });
  }
  static delete(channel: TextChannel, timeout?: DurationInput) {
    return Effect.gen(function* (_) {
      if (timeout) yield* _(Effect.sleep(timeout));
      yield* _(
        Effect.tryPromise({
          try: () => channel.delete(),
          catch: (unknown) => {
            if (unknown instanceof DiscordAPIError) {
              return new ChannelServiceError(unknown.message, "delete");
            } else {
              return new ChannelServiceError(unknown, "delete");
            }
          },
        })
      );
    });
  }
}
