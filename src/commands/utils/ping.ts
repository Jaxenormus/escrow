import { ChatInputCommand, Command } from '@sapphire/framework';
import { Message } from 'discord.js';

export default class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'ping',
      description: 'Check if the bot is alive',
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder.setName(this.name).setDescription(this.description)
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    return interaction.reply('Pong');
  }

  public async messageRun(message: Message) {
    return message.reply('Pong');
  }
}
