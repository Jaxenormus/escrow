import type { ChatInputCommand } from "@sapphire/framework";
import { Command } from "@sapphire/framework";
import { ChannelType } from "discord.js";
import { Console, Effect } from "effect";


export default class TestCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "test",
      description: "Test command",
      preconditions: ["DeveloperOnly"],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand((builder) => builder.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.channel && interaction.channel.isTextBased() && interaction.inGuild()) {
      await interaction.deferReply({ ephemeral: true });
      await Effect.runPromise(
        Effect.gen(function* (_) {
          if (interaction.channel && interaction.channel.type === ChannelType.GuildText) {
            yield* _(Console.log("test"));
          }
        })
      );
    }
  }
}
