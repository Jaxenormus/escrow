import type { ChatInputCommand } from "@sapphire/framework";
import { Command, container } from "@sapphire/framework";
import { Effect, Either } from "effect";

import { TradeMediums } from "@/src/config";
import { InteractionService } from "@/src/helpers/services/Interaction";

export default class NewAddressCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "new-address",
      description: "Creates a new address for the specified coin",
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
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const coin = interaction.options.getString("coin", true) as TradeMediums;
    await Effect.runPromise(
      Effect.gen(function* (_) {
        const responseEither = yield* _(Effect.either(container.api.crypto.newBotAddress(coin)));
        if (Either.isRight(responseEither)) {
          const response = responseEither.right;
          return yield* _(InteractionService.followUp(interaction, { content: response.data }));
        } else {
          const error = responseEither.left;
          return yield* _(InteractionService.followUp(interaction, { content: error.message }));
        }
      })
    );
  }
}
