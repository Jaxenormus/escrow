import { ChatInputCommand, Command, container } from '@sapphire/framework';

import Identities from '@/classes/Identities';
import { GAME_TRADE_TYPES, PARTIES, TRADE_TYPES } from '@/context';
import Ticket from '@/entities/Ticket';
import handleGameDealRelease from '@/helpers/game/handleGameDealRelease';
import handlePlayerSelection from '@/helpers/shared/handlers/handlePlayerSelection';

export default class ReleaseDealCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'release-game',
      description: 'Manually release a game deal items',
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

  // eslint-disable-next-line consistent-return
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
    await ticket.gameDeal.init();
    ticket.gameDeal.buyer = account.id.toString();
    ticket.gameDeal.seller = account.id.toString();
    await container.db.em.persistAndFlush(ticket);
    await handleGameDealRelease(
      interaction.channel,
      ids,
      ticket.type as GAME_TRADE_TYPES,
      PARTIES.RECEIVER,
      false
    );
  }
}
