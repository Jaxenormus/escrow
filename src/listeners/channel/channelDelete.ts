import { Listener, container } from "@sapphire/framework";
import { ChannelType, type GuildChannel } from "discord.js";
import { Effect } from "effect";
import { isNil } from "lodash";

import { clearInactivityTasks } from "@/src/helpers/tasks/clearInactivityTasks";

export default class ChannelDeleteListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "channelDelete",
    });
  }

  public async run(channel: GuildChannel) {
    this.container.events.ticket.emit(channel.id, "terminate");
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const matches = channel.name.match(/^(.+)-([0-9]+)$/);
        if (!isNil(matches) && channel.isTextBased() && channel.type === ChannelType.GuildText) {
          yield* _(Effect.succeed(container.events.ticket.emit(channel.id, "terminate")));
          yield* _(clearInactivityTasks(channel));
        }
      })
    );
  }
}
