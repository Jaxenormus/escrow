import { ChatInputCommand, Command, container } from '@sapphire/framework';
import { each } from 'bluebird';
import { Formatters } from 'discord.js';
import { isEmpty } from 'lodash';

import Account from '@/entities/Account';

export default class DeleteCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'disconnect-account',
      description: 'Disconnects an account from the trades its in',
      preconditions: ['AdminOnly'],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option.setName('id').setDescription('The id of the account to delete').setRequired(true)
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const id = interaction.options.getString('id', true);
    const account = await this.container.db.em.findOne(Account, { id });
    if (!account) {
      interaction.reply(`${Formatters.inlineCode(id)} does not exist`);
    } else {
      try {
        const displayName = Formatters.inlineCode(account.username);
        if (isEmpty(account.tickets)) {
          interaction.reply(`${displayName} is not involved in any trades`);
        } else {
          await account.tickets.init();
          await each(account.tickets.getItems(), async ticket => {
            await this.container.db.em.removeAndFlush(ticket);
          });
          interaction.reply(`${displayName} has been disconnected from all trades`);
        }
      } catch (e) {
        container.sentry.handleException(e);
        interaction.reply('Unable to find username');
      }
    }
  }
}
