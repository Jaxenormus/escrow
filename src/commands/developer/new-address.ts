import { ChatInputCommand, Command } from '@sapphire/framework';

import { EXPANDED_TRADE_TYPES, TRADE_TYPES } from '@/context';
import newBotAddress from '@/helpers/crypto/utils/newBotAddress';

export default class FundCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'new-address',
      description: 'Creates a new temp address',
      preconditions: ['DeveloperOnly'],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('coin')
            .setDescription('The coin of the address')
            .setRequired(true)
            .addChoices(
              { name: EXPANDED_TRADE_TYPES[TRADE_TYPES.BITCOIN], value: TRADE_TYPES.BITCOIN },
              { name: EXPANDED_TRADE_TYPES[TRADE_TYPES.ETHEREUM], value: TRADE_TYPES.ETHEREUM },
              { name: EXPANDED_TRADE_TYPES[TRADE_TYPES.LITECOIN], value: TRADE_TYPES.LITECOIN }
            )
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const coin = interaction.options.getString('coin', true) as TRADE_TYPES;
    const address = await newBotAddress(coin);
    interaction.reply(address.address);
  }
}
