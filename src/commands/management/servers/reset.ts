/* eslint-disable no-await-in-loop */
import { ChatInputCommand, Command } from '@sapphire/framework';
import {
  Formatters,
  Message,
  MessageActionRow,
  MessageSelectMenu,
  MessageSelectOptionData,
  TextChannel,
} from 'discord.js';

import { TRADE_TYPES } from '@/context';
import Server from '@/entities/Server';
import Ticket from '@/entities/Ticket';
import handleMenuSelection from '@/helpers/core/handleMenuSelection';

export default class DisconnectServersCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'reset-server',
      description: 'Handles the severing of a server from an account',
      preconditions: ['AdminOnly'],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option => option.setName('server').setDescription('The server to reset'))
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('The type of servers to reset')
            .addChoices(
              { name: 'Adopt Me', value: TRADE_TYPES.ADOPT_ME },
              { name: 'Hood Modded', value: TRADE_TYPES.HOOD_MODDED }
            )
        )
    );
  }

  private async resetServer(
    interaction: Command.ChatInputInteraction,
    serverId: string
  ): Promise<boolean> {
    try {
      const server = await this.container.db.em.findOne(Server, { id: serverId });
      const account = await server.account.init();
      account.hasJoinedServer = false;
      account.server = null;
      server.account = null;
      server.attemptingToJoin = false;
      await this.container.db.em.persistAndFlush([account, server]);
      await interaction.channel.send(
        `Server ${Formatters.inlineCode(serverId)} has been severed from ${Formatters.inlineCode(
          account.username
        )}`
      );
      return true;
    } catch (error) {
      await interaction.channel.send(
        `An error occurred while resetting ${Formatters.inlineCode(
          serverId
        )}\n${Formatters.codeBlock(error)}`
      );
      return false;
    }
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const serverId = interaction.options.getString('server');
    const type = interaction.options.getString('type') as TRADE_TYPES;
    const serversToReset = [];
    if (!serverId && !type) {
      const tickets = await this.container.db.em.find(Ticket, {
        type: { $in: [TRADE_TYPES.ADOPT_ME, TRADE_TYPES.HOOD_MODDED] },
        account: { server: { $ne: null } },
      });
      if (tickets.length === 0)
        return interaction.reply({
          content: `No active tickets found, specify a ${Formatters.inlineCode(
            'server'
          )} or ${Formatters.inlineCode('type')}`,
          ephemeral: true,
        });
      const options: MessageSelectOptionData[] = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const ticket of tickets) {
        const server = await ticket.server.init();
        const channel = (await this.container.client.channels.fetch(ticket.id)) as TextChannel;
        options.push({ label: `#${channel.name}`, value: server.id });
      }
      const reply = await interaction.followUp({
        components: [
          new MessageActionRow().addComponents(
            new MessageSelectMenu()
              .setCustomId('servers')
              .addOptions(options)
              .setPlaceholder('Select a ticket')
          ),
        ],
      });
      const { value: selection } = await handleMenuSelection(reply as Message);
      serversToReset.push(selection);
    } else {
      await interaction.deferReply();
    }
    if (serverId) {
      serversToReset.push(serverId);
    } else {
      const servers = await this.container.db.em.find(Server, { type });
      serversToReset.push(...servers.map(({ id }) => id));
    }
    let numOfSuccesses = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const server of serversToReset) {
      const status = await this.resetServer(interaction, server);
      if (status) numOfSuccesses += 1;
    }
    return interaction.followUp({
      content: `Successfully reset ${Formatters.inlineCode(
        numOfSuccesses.toString()
      )} server(s), failed to reset ${Formatters.inlineCode(
        (serversToReset.length - numOfSuccesses).toString()
      )} server(s)`,
      components: [],
    });
  }
}
