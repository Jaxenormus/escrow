import { Listener } from "@sapphire/framework";
import type { GuildChannel } from "discord.js";
import { ChannelType, UserSelectMenuBuilder } from "discord.js";
import { ActionRowBuilder, EmbedBuilder, codeBlock, userMention } from "discord.js";
import { Effect, Either } from "effect";
import { isNil, toLower, toString } from "lodash";
import { startCase } from "lodash";

import { TradeMediums } from "@/src/config";
import { EmbedColors, Interactions } from "@/src/config";
import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";
import { PrematureTerminationError } from "@/src/errors/PrematureTermination";
import handleCrypto from "@/src/handlers/crypto/handleCryptoDeal";
import { listenForInteractions } from "@/src/helpers/listenForInteractions";
import { ChannelService } from "@/src/helpers/services/Channel";
import { InteractionService } from "@/src/helpers/services/Interaction";
import { MemberService } from "@/src/helpers/services/Member";
import { MessageService } from "@/src/helpers/services/Message";

export default class ChannelCreateListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "channelCreate",
    });
  }

  public async run(channel: GuildChannel) {
    const matches = channel.name.match(/^(.+)-([0-9]+)$/);
    if (!isNil(matches) && channel.isTextBased() && channel.type === ChannelType.GuildText) {
      const medium = TradeMediums[startCase(matches[1].replace("-", "_")) as unknown as keyof typeof TradeMediums];
      if (medium) {
        await Effect.runPromise(this.container.api.statistics.trackTicketAction(channel, medium, "create"));
        const prompt = await channel.send({
          embeds: [
            new EmbedBuilder({
              title: "Escrow Automated Middleman",
              description: `Please select the other participant in this ${toLower(medium)} trade below.`,
              color: EmbedColors.Main,
            }),
          ],
          components: [
            new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
              new UserSelectMenuBuilder()
                .setCustomId(Interactions.TicketParticipantUserSelectMenu)
                .setPlaceholder("Select other participant")
                .setMaxValues(1)
            ),
          ],
        });

        await Effect.runPromise(
          listenForInteractions(prompt, (interaction, end) =>
            Effect.gen(function* (_) {
              if (
                interaction.customId === Interactions.TicketParticipantUserSelectMenu &&
                interaction.isUserSelectMenu()
              ) {
                const member = yield* _(MemberService.fetch(channel.guild, interaction.values[0]));
                let errorMsg = "";

                if (member.id === interaction.user.id) {
                  errorMsg = "You cannot add yourself to a ticket. Please try again.";
                } else if (member.user.bot) {
                  errorMsg = "You cannot add a bot to a ticket. Please try again.";
                }

                if (errorMsg) {
                  const reply = yield* _(InteractionService.followUp(interaction, errorMsg));
                  yield* _(MessageService.delete(reply, "5 seconds"));
                } else {
                  yield* _(
                    ChannelService.overridePermissions(channel, member.id, {
                      ViewChannel: true,
                      SendMessages: true,
                      ReadMessageHistory: true,
                    })
                  );
                  yield* _(
                    InteractionService.followUp(interaction, `${userMention(member.id)} has been added to this ticket.`)
                  );
                  yield* _(Effect.sync(() => end()));
                }
              }
            })
          )
        );

        await Effect.runPromise(this.container.api.statistics.trackTicketAction(channel, medium, "invite"));

        switch (medium) {
          case TradeMediums.Bitcoin:
          case TradeMediums.Ethereum:
          case TradeMediums.Litecoin: {
            // Its not really important if this fails, so we don't need to handle the result
            const response = await Effect.runPromise(handleCrypto(channel, medium));
            if (Either.isLeft(response)) {
              const error = response.left;
              const isPrematureTerminationError =
                error instanceof PrematureTerminationError && error._tag === "PrematureTerminationError";
              if (!isPrematureTerminationError) {
                if (error instanceof ExpectedExecutionError) {
                  Effect.runPromiseExit(
                    MessageService.send(channel, {
                      embeds: [
                        new EmbedBuilder()
                          .setTitle(error.title)
                          .setDescription(`${error.message}\n${codeBlock(toString(error.error))}`)
                          .setColor(EmbedColors.Error),
                      ],
                    })
                  ).then(() => Effect.interrupt);
                } else {
                  Effect.runPromiseExit(
                    MessageService.send(channel, {
                      content: userMention("1138627371965100063"),
                      embeds: [
                        new EmbedBuilder()
                          .setTitle("An unhandled error occurred")
                          .setDescription(`An unhandled error occurred.\n${codeBlock(toString(error))}`)
                          .setColor(EmbedColors.Error),
                      ],
                    })
                  ).then(() => Effect.interrupt);
                }
              }
            }
            break;
          }
        }
      }
    }
  }
}
