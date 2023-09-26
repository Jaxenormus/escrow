import type { ChatInputCommand } from "@sapphire/framework";
import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, inlineCode } from "discord.js";
import { Effect, Exit } from "effect";

import { TradeMediums } from "@/src/config";
import { findHashUrl } from "@/src/helpers/crypto/findHashUrl";

export default class ReleaseCryptoCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "release-crypto",
      description: "Manually releases crypto held in bot address to a specified address",
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
            .setName("coin")
            .setDescription("The coin of the address")
            .setRequired(true)
            .addChoices(
              { name: "Bitcoin", value: TradeMediums.Bitcoin },
              { name: "Ethereum", value: TradeMediums.Ethereum },
              { name: "Litecoin", value: TradeMediums.Litecoin }
            )
        )
        .addStringOption((option) =>
          option.setName("from").setDescription("The address to release from").setRequired(true)
        )
        .addStringOption((option) => option.setName("to").setDescription("The address to release to").setRequired(true))
    );
  }

  // eslint-disable-next-line consistent-return
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.channel && interaction.channel.isTextBased() && interaction.inGuild()) {
      await interaction.deferReply();
      const medium = interaction.options.getString("coin", true) as TradeMediums;
      const from = interaction.options.getString("from", true);
      const to = interaction.options.getString("to", true);
      const rawAddress = await Effect.runPromiseExit(this.container.db.findAddress({ id: from }));
      return Exit.match(rawAddress, {
        onSuccess: async (address) => {
          if (address) {
            return Effect.match(this.container.api.crypto.releaseHeldCrypto(medium, address, to), {
              onSuccess: async (hash) => {
                await interaction.editReply({
                  content: `Funds have been released from to ${inlineCode(to)}`,
                  components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                      new ButtonBuilder()
                        .setURL(findHashUrl(medium, hash))
                        .setLabel("View Transaction")
                        .setStyle(ButtonStyle.Link)
                    ),
                  ],
                });
              },
              onFailure(error) {
                return interaction.editReply({ content: error.message });
              },
            });
          }
        },
        onFailure: (cause) => {
          return interaction.editReply({ content: cause.toString() });
        },
      });
    }
  }
}
