import type { ChatInputCommand } from "@sapphire/framework";
import { Command, container } from "@sapphire/framework";
import { Effect } from "effect";

import { InteractionService } from "@/src/services/Interaction";

export default class RecoverCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "recover",
      description: "Grabs the recovery key of an address",
      preconditions: ["DeveloperOnly"],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) => option.setName("channel").setDescription("The channel to release from"))
    );
  }

  // eslint-disable-next-line consistent-return
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.channel && interaction.channel.isTextBased() && interaction.inGuild()) {
      await interaction.deferReply({ ephemeral: true });
      const channelOption = interaction.options.getString("channel");
      const channelId = channelOption ? channelOption : interaction.channel.id;
      return Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const address = yield* _(container.db.findAddress({ id: channelId }));
          if (address) {
            yield* _(InteractionService.followUp(interaction, { content: address.recovery, ephemeral: true }));
          } else {
            yield* _(
              InteractionService.followUp(interaction, {
                content: `Address for this ticket not found in database`,
                ephemeral: true,
              })
            );
          }
        })
      );
    }
  }
}
