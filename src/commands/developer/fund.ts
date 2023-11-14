import type { ChatInputCommand } from "@sapphire/framework";
import { Command, container } from "@sapphire/framework";
import { Effect, Either } from "effect";
import sb from "satoshi-bitcoin";
import web3 from "web3";

import { TradeMediums } from "@/src/config";
import { InteractionService } from "@/src/services/Interaction";

export default class FundCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "fund",
      description: "Sends specified amount of funds to the specified address",
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
            .setDescription("The coin to fund")
            .setRequired(true)
            .addChoices(
              { name: "Bitcoin", value: TradeMediums.Bitcoin },
              { name: "Ethereum", value: TradeMediums.Ethereum },
              { name: "Litecoin", value: TradeMediums.Litecoin }
            )
        )
        .addStringOption((option) =>
          option.setName("address").setDescription("The address to send funds to").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("amount").setDescription("The amount of funds to send").setRequired(true)
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.channel && interaction.channel.isTextBased()) {
      await interaction.deferReply();
      const coin = interaction.options.getString("coin", true) as unknown as TradeMediums;
      const address = interaction.options.getString("address", true);
      const rawAmount = interaction.options.getString("amount", true);
      const amount =
        coin === TradeMediums.Ethereum ? web3.utils.toWei(rawAmount, "ether") : sb.toSatoshi(rawAmount);
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const responseEither = yield* _(Effect.either(container.api.crypto.faucet(coin, address, amount.toString())));
          if (Either.isRight(responseEither)) {
            const response = responseEither.right;
            return yield* _(InteractionService.followUp(interaction, { content: response.data.tx_ref }));
          } else {
            const error = responseEither.left;
            return yield* _(InteractionService.followUp(interaction, { content: error.message }));
          }
        })
      );
    }
  }
}
