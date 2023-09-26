/* eslint-disable no-await-in-loop */
import type { ChatInputCommand } from "@sapphire/framework";
import { Command } from "@sapphire/framework";
import { inlineCode } from "discord.js";

export default class ResetCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "reset",
      description: "Deletes all registered slash commands",
      preconditions: ["DeveloperOnly"],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand((builder) => builder.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.channel && interaction.channel.isTextBased()) {
      await interaction.reply("Deleting all registered slash commands...");
      const commands = await interaction.client.application.commands.fetch();
      // eslint-disable-next-line no-restricted-syntax
      for (const command of commands.values()) {
        if (command) {
          const cmdName = inlineCode(command.name);
          const msg = await interaction.channel.send(`Found command ${cmdName}`);
          await command.delete();
          await msg.edit(`Deleted command ${cmdName}`);
        }
      }
      await interaction.editReply("All commands have been deleted.");
    }
  }
}
