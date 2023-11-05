import type { ChatInputCommand } from "@sapphire/framework";
import { Command } from "@sapphire/framework";
import type { TextChannel } from "discord.js";
import { Effect } from "effect";

import { MessageService } from "@/src/helpers/services/Message";

export default class RenameCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "rename",
      description: "Renames a ticket to signify the status of the ticket",
      preconditions: ["DeveloperOnly"],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName("prefix")
            .setDescription("The new prefix")
            .setRequired(true)
            .addChoices({ name: "jax", value: "jax" }, { name: "hold", value: "hold" })
        )
    );
  }

  // eslint-disable-next-line consistent-return
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.channel && interaction.channel.isTextBased() && interaction.inGuild()) {
      await interaction.deferReply({ ephemeral: true });
      const prefixOption = interaction.options.getString("prefix");
      const ticketId = interaction.channel.name.match(/^(.+)-([0-9]+)$/)?.[2];
      return Effect.runPromiseExit(
        Effect.gen(function* (_) {
          if (ticketId) {
            yield _(MessageService.send(interaction.channel as TextChannel, `$rename ${prefixOption}-${ticketId}`));
          }
        })
      );
    }
  }
}
