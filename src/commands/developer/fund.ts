import { ChatInputCommand, Command } from '@sapphire/framework';
import sb from 'satoshi-bitcoin';
import web3 from 'web3';

import { EXPANDED_TRADE_TYPES, TRADE_TYPES } from '@/context';

export default class FundCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'fund',
      description: 'Sends specified amount of funds to the specified address',
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
            .setDescription('The coin to fund')
            .setRequired(true)
            .addChoices(
              { name: EXPANDED_TRADE_TYPES[TRADE_TYPES.BITCOIN], value: TRADE_TYPES.BITCOIN },
              { name: EXPANDED_TRADE_TYPES[TRADE_TYPES.ETHEREUM], value: TRADE_TYPES.ETHEREUM },
              { name: EXPANDED_TRADE_TYPES[TRADE_TYPES.LITECOIN], value: TRADE_TYPES.LITECOIN }
            )
        )
        .addStringOption(option =>
          option.setName('address').setDescription('The address to send funds to').setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount').setDescription('The amount of funds to send').setRequired(true)
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const coin = interaction.options.getString('coin', true) as TRADE_TYPES;
    const address = interaction.options.getString('address', true);
    const rawAmount = interaction.options.getInteger('amount', true);
    const amount =
      coin === TRADE_TYPES.ETHEREUM
        ? web3.utils.toWei(rawAmount.toString())
        : sb.toSatoshi(rawAmount);
    this.container
      .blockcypher(coin)
      .post('/faucet', { address, amount: parseInt(amount, 10) })
      .then(({ data }) => {
        interaction.reply(data.tx_ref);
      })
      .catch(err => {
        interaction.reply(err);
      });
  }
}
