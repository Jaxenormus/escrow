import { ChatInputCommand, Command } from '@sapphire/framework';

import Identities from '@/classes/Identities';
import { PARTIES, TRADE_TYPES } from '@/context';
import handleAddyCollection from '@/helpers/crypto/handleAddyCollection';

export default class TestCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'test',
      description: 'Test command',
      preconditions: ['DeveloperOnly'],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder.setName(this.name).setDescription(this.description)
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply();
    const ids = new Identities();
    ids.set(PARTIES.SENDER, '546491068598976522');
    ids.set(PARTIES.RECEIVER, '546491068598976522');
    handleAddyCollection(interaction.channel, ids, TRADE_TYPES.LITECOIN, PARTIES.RECEIVER);
  }
}
