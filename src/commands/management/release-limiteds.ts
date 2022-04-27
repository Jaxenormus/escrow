import { ChatInputCommand, Command } from '@sapphire/framework';

import Identities from '@/classes/Identities';
import { PARTIES, TRADE_TYPES } from '@/context';
import Ticket from '@/entities/Ticket';
import handleTradeSelection from '@/helpers/limiteds/handleTradeSelection';
import handlePlayerSelection from '@/helpers/shared/handlers/handlePlayerSelection';

export default class ReleaseLimitedsCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'release-limiteds',
      description: 'Manually release in game items in an open ticket',
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
            .setName('receiver')
            .setDescription('The username or profile link of the receiver')
            .setRequired(true)
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply();
    const ticket = await this.container.db.em.findOne(Ticket, interaction.channel.id);
    if (!ticket) interaction.editReply({ content: 'Unable to find ticket' });
    await ticket.account.init();
    const rawReceiver = interaction.options.getString('receiver', true);
    const ids = new Identities();
    ids.set(PARTIES.SENDER, interaction.user.id);
    ids.set(PARTIES.RECEIVER, interaction.user.id);
    const account = await handlePlayerSelection(
      TRADE_TYPES.LIMITEDS,
      interaction.channel,
      ids,
      PARTIES.RECEIVER,
      { cleanUp: true, isStaff: true, usernameToFind: rawReceiver }
    );
    await handleTradeSelection(interaction.channel, ticket.account.id, ids, PARTIES.RECEIVER, {
      singleConfirmation: true,
      senderId: account.id,
    });
  }
}
