import { container } from "@sapphire/pieces";
import type {
  GuildChannel,
  GuildChannelOverwriteOptions,
  PermissionOverwriteOptions,
  RoleResolvable,
  UserResolvable,
} from "discord.js";
import { DiscordAPIError } from "discord.js";
import { Effect } from "effect";

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
        container.sentry.captureException(unknown);
        if (unknown instanceof DiscordAPIError) {
          return new ChannelServiceError(unknown.message, "overridePermissions");
        } else {
          return new ChannelServiceError(unknown, "overridePermissions");
        }
      },
    });
  }
}
