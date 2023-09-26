import { Listener } from "@sapphire/framework";
import { ActivityType, type Client } from "discord.js";

export default class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: "ready",
    });
  }

  public run(client: Client) {
    client.user?.setActivity("Commands", { type: ActivityType.Watching });
    this.container.logger.info(`Successfully logged in as ${client.user?.username}`);
  }
}
