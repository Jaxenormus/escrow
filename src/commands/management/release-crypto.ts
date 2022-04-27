import { ChatInputCommand, Command, container } from '@sapphire/framework';
import { Formatters, MessageActionRow, MessageButton } from 'discord.js';

import Ticket from '@/entities/Ticket';
import findHashUrl from '@/helpers/crypto/utils/findHashUrl';
import releaseHeldCrypto from '@/helpers/crypto/utils/releaseHeldCrypto';

export default class ReleaseCryptoCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'release-crypto',
      description: 'Manually releases crypto held in bot address to a specified address',
      preconditions: ['AdminOnly'],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option.setName('to').setDescription('The address to release to').setRequired(true)
        )
    );
  }

  // eslint-disable-next-line consistent-return
  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply();
    const ticket = await this.container.db.em.findOne(Ticket, { id: interaction.channelId });
    if (!ticket)
      return interaction.editReply({
        content: 'This command can only be used in a ticket channel',
      });
    const to = interaction.options.getString('to', true);
    const address = await ticket.address.init();
    try {
      const hash = await releaseHeldCrypto(address.type, address.address, to);
      await interaction.editReply({
        content: `Funds have been released from to ${Formatters.inlineCode(to)}`,
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setURL(findHashUrl(address.type, hash))
              .setLabel('View Transaction')
              .setStyle('LINK')
          ),
        ],
      });
    } catch (e) {
      container.sentry.handleException(e);
      await interaction.editReply({
        content: `There was an error releasing funds to ${Formatters.inlineCode(
          to
        )}\n${Formatters.codeBlock(e.message)}`,
      });
    }
  }
}
