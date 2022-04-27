import { ChatInputCommand, Command, container } from '@sapphire/framework';
import { Formatters } from 'discord.js';

import Account from '@/entities/Account';

export default class DeleteCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'delete-account',
      description: 'Deletes an account from the bot',
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
    try {
      const account = await this.container.db.em.findOne(Account, { id });
      await this.container.db.em.removeAndFlush(account);
      interaction.reply(`${Formatters.inlineCode(account.username)} has been deleted`);
    } catch (e) {
      container.sentry.handleException(e);
      await interaction.reply('The id provided is invalid');
    }
  }
}
