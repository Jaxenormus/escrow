import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { Formatters } from 'discord.js';

import { PLACE_IDS, TRADE_TYPES } from '@/context';
import Server from '@/entities/Server';

export default class AddCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'add-server',
      description: 'Adds a new vip server to the bot',
      preconditions: ['AdminOnly'],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('link')
            .setDescription('The link of the private server to add')
            .setRequired(true)
        )
    );
  }

  // eslint-disable-next-line consistent-return
  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply();
    const link = interaction.options.getString('link', true);
    const regex = link.match(/\/games\/(\d+)\?privateServerLinkCode=(\d+)/);
    if (!regex) return interaction.editReply('Invalid link');
    const gameId = regex[1];
    const serverId = regex[2];
    const place = Object.keys(PLACE_IDS).find(key => PLACE_IDS[key] === gameId);
    if (!place) return interaction.editReply('Invalid game');
    try {
      const server = this.container.db.em.create(Server, {
        id: regex[2],
        placeId: regex[1],
        type: place as TRADE_TYPES,
        attemptingToJoin: false,
      });
      await this.container.db.em.persistAndFlush(server);
      await interaction.editReply(
        `The server ${Formatters.inlineCode(serverId)} for ${Formatters.inlineCode(
          place
        )} has been added`
      );
    } catch (e) {
      if (e instanceof UniqueConstraintViolationException) {
        return interaction.editReply(
          `The server ${Formatters.inlineCode(serverId)} for ${Formatters.inlineCode(
            place
          )} already exists`
        );
      }
      this.container.sentry.handleException(e);
      await interaction.editReply('An unknown error occurred');
    }
  }
}
