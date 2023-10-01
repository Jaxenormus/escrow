import type { ChatInputCommand } from "@sapphire/framework";
import { Command, container } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, inlineCode } from "discord.js";
import { Effect, Either } from "effect";

import { TradeMediums } from "@/src/config";
import { findHashUrl } from "@/src/helpers/crypto/findHashUrl";
import { InteractionService } from "@/src/helpers/services/Interaction";

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
        .addStringOption((option) => option.setName("to").setDescription("The address to release to").setRequired(true))
        .addStringOption((option) => option.setName("channel").setDescription("The channel to release from"))
    );
  }

  // eslint-disable-next-line consistent-return
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.channel && interaction.channel.isTextBased() && interaction.inGuild()) {
      await interaction.deferReply();
      const medium = interaction.options.getString("coin", true) as TradeMediums;
      const to = interaction.options.getString("to", true);
      const channelOption = interaction.options.getString("channel");
      const channelId = channelOption ? channelOption : interaction.channel.id;
      return Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const address = yield* _(container.db.findAddress({ id: channelId }));
          if (address) {
            const releaseEither = yield* _(Effect.either(container.api.crypto.releaseHeldCrypto(medium, address, to)));
            if (Either.isRight(releaseEither)) {
              yield* _(
                InteractionService.followUp(interaction, {
                  content: `${medium} have been released from ${inlineCode(address.data)} to ${inlineCode(to)}`,
                  components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                      new ButtonBuilder()
                        .setURL(findHashUrl(medium, releaseEither.right))
                        .setLabel("View Transaction")
                        .setStyle(ButtonStyle.Link)
                    ),
                  ],
                })
              );
            } else {
              yield* _(
                InteractionService.followUp(interaction, `Error releasing funds: ${releaseEither.left.message}`)
              );
            }
          } else {
            yield* _(InteractionService.followUp(interaction, `Address for this ticket not found in database`));
          }
        })
      );
    }
  }
}
