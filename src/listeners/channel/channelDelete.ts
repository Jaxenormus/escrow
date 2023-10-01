import { Listener } from "@sapphire/framework";
import { type GuildChannel } from "discord.js";

export default class ChannelDeleteListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "channelDelete",
    });
  }

  public async run(channel: GuildChannel) {
    if (channel.isTextBased()) this.container.events.ticket.emit(channel.id, "terminate");
  }
}
