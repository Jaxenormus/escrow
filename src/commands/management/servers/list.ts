/* eslint-disable no-await-in-loop */
import { ChatInputCommand, Command } from '@sapphire/framework';
import { Formatters } from 'discord.js';
import { isEmpty, isNil } from 'lodash';

import Embed from '@/classes/Embed';
import { TRADE_TYPES } from '@/context';
import Server from '@/entities/Server';

export default class AddCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'servers',
      description: 'Lists all the servers that are available',
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
            .setName('type')
            .setDescription('What type of servers do you want to list')
            .setRequired(true)
            .addChoices(
              { name: 'Adopt Me', value: TRADE_TYPES.ADOPT_ME },
              { name: 'Hood Modded', value: TRADE_TYPES.HOOD_MODDED }
            )
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply();
    const type = interaction.options.getString('type', true) as TRADE_TYPES;
    const servers = await this.container.db.em.find(Server, { type });
    const embed = new Embed().setTitle('Servers');
    const fields = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const server of servers) {
      let { account } = server;
      if (account) account = await account.init();
      let tickets = [];
      if (account) tickets = (await account.tickets.init()).toArray();
      fields.push({
        name: server.id,
        value: isNil(account)
          ? 'No assigned account'
          : `${account.username} (${
              isEmpty(tickets) ? 'No Ticket' : Formatters.channelMention(tickets[0].id)
            })`,
      });
    }
    embed.addFields(fields);
    await interaction.editReply({ embeds: [embed] });
  }
}
