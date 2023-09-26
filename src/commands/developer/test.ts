import type { ChatInputCommand } from "@sapphire/framework";
import { Command, container } from "@sapphire/framework";
import { Effect } from "effect";

import { TradeMediums } from "@/src/config";
import { waitForConfirmation } from "@/src/helpers/crypto/waitForConfirmation";

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
          if (interaction.channel && interaction.channel.isTextBased()) {
            const medium = TradeMediums.Ethereum;
            const identification = {
              SENDER: { id: "1138627371965100063", mention: "<@1138627371965100063>" },
              RECEIVER: { id: "1138627371965100063", mention: "<@1138627371965100063>" },
              all: {
                id: ["1138627371965100063", "1138627371965100063"],
                mention: "<@1138627371965100063> <@1138627371965100063>",
              },
            };
            const amount = {
              raw_fiat: 100000,
              fiat: "$100,000.00",
              raw_crypto: 3.80690361302523,
              crypto: "3.80690361",
            };
            const address = yield* _(
              Effect.tryPromise(() =>
                container.db.prisma.address.findFirst({ where: { data: "31147b0a0b4e2073a27c9ae2cde3a06457730cb5" } })
              )
            );
            // const verdict = yield* _(handleDealConfirmation(interaction.channel, identification, medium));
            yield* _(
              waitForConfirmation(medium, "6aba8ea84e8d52c02c74f2e24ce78cb8364b13b16105e8e39b5e9d0e39c67d0e", 500)
            );
            // console.log(verdict);
          }
        })
      );
    }
  }
}
