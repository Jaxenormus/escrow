import { ChatInputCommand, Command } from '@sapphire/framework';
import { each } from 'bluebird';
import { isEmpty } from 'lodash';

import Embed from '@/classes/Embed';
import { TRADE_TYPES } from '@/context';
import Account from '@/entities/Account';

export default class AccountsCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'accounts',
      description: 'Returns a list of all the bot accounts and their active trades',
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
            .setDescription('What type of accounts do you want to list')
            .setRequired(true)
            .addChoices(
              { name: 'Limiteds', value: TRADE_TYPES.LIMITEDS },
              { name: 'Adopt Me', value: TRADE_TYPES.ADOPT_ME },
              { name: 'Hood Modded', value: TRADE_TYPES.HOOD_MODDED }
            )
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const type = interaction.options.getString('type', true) as TRADE_TYPES;
    const accounts = await this.container.db.em.find(Account, { type });
    const embed = new Embed({ title: 'Accounts' });
    await each(accounts, async account => {
      await account.tickets.init();
      embed.addFields([
        {
          name: `${account.username} (${account.id})`,
          value: isEmpty(account.tickets.getItems())
            ? 'No active trades'
            : `${account.tickets
                .getItems()
                .map(ticket => `<#${ticket.id}>`)
                .join(' ')}`,
        },
      ]);
    });
    await interaction.reply({ embeds: [embed] });
  }
}
