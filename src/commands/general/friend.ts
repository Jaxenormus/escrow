import { ChatInputCommand, Command, container } from '@sapphire/framework';
import { Formatters, Message, MessageActionRow, MessageButton } from 'discord.js';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, INTERACTIONS, PARTIES, TRADE_TYPES } from '@/context';
import Ticket from '@/entities/Ticket';
import handleInteractions from '@/helpers/core/handleInteractions';
import handleRobloxRequest from '@/helpers/limiteds/handleRobloxRequest';
import handlePlayerSelection from '@/helpers/shared/handlers/handlePlayerSelection';

export default class FriendCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'friend',
      description: 'Allows you to friend a bot account',
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder.setName(this.name).setDescription(this.description)
    );
  }

  // eslint-disable-next-line consistent-return
  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply();
    const ids = new Identities();
    ids.set(PARTIES.SENDER, interaction.user.id);
    ids.set(PARTIES.RECEIVER, interaction.user.id);
    const ticket = await this.container.db.em.findOne(
      Ticket,
      { id: interaction.channel.id },
      { populate: ['account'] }
    );
    if (!ticket)
      return interaction.editReply({
        embeds: [
          new Embed()
            .setDescription('There is currently no trade in progress')
            .setColor(COLORS.ERROR),
        ],
      });
    const userInstance = await handleRobloxRequest(ticket.account);
    const isValid = userInstance
      .get('https://users.roblox.com/v1/users/authenticated')
      .then(() => true)
      .catch(e => {
        container.sentry.handleException(e);
        return false;
      });
    if (!isValid)
      return interaction.editReply({
        embeds: [new Embed().setDescription('The account is not valid').setColor(COLORS.ERROR)],
      });
    let toSendTo = null;
    const handleAccountSelection = async () => {
      const { id } = await handlePlayerSelection(
        TRADE_TYPES.LIMITEDS,
        interaction.channel,
        ids,
        PARTIES.SENDER,
        { cleanUp: true }
      );
      toSendTo = id;
    };
    const handleFriendRequest = async () => {
      try {
        const friendRequestInstance = await handleRobloxRequest(ticket.account, true);
        await friendRequestInstance.post(
          `https://friends.roblox.com/v1/users/${toSendTo}/request-friendship`
        );
        const msg = await interaction.editReply({
          embeds: [
            new Embed()
              .setTitle('Request has been sent')
              .setDescription(
                'Friend request has been sent, please accept it and continue with the trade'
              )
              .setColor(COLORS.SUCCESS),
          ],
          components: [
            new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId(INTERACTIONS.FRIEND_COMMAND_RESEND_BUTTON)
                .setLabel('Resend')
                .setStyle('SECONDARY')
            ),
          ],
        });
        if (msg instanceof Message) {
          handleInteractions(msg, (interaction2, end) => {
            if (
              interaction2.customId === INTERACTIONS.FRIEND_COMMAND_RESEND_BUTTON &&
              interaction2.user.id === ids.get(PARTIES.SENDER)
            ) {
              end();
              handleFriendRequest();
            }
          });
        }
      } catch (e) {
        container.sentry.handleException(e);
        const { errors } = e.response.data;
        const msg = await interaction.editReply({
          embeds: [
            new Embed()
              .setTitle('Unable to send friend request')
              .setDescription(`The following error(s) occurred, please try again`)
              .addFields(
                (errors ?? []).map((err, index) => ({
                  name: `#${index + 1}`,
                  value: Formatters.codeBlock(err.message),
                }))
              )
              .setColor(COLORS.ERROR),
          ],
          components: [
            new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId(INTERACTIONS.FRIEND_COMMAND_RETRY_BUTTON)
                .setLabel('Resend Request')
                .setStyle('SECONDARY')
            ),
          ],
        });
        if (msg instanceof Message) {
          handleInteractions(msg, (interaction2, end) => {
            if (
              interaction2.customId === INTERACTIONS.FRIEND_COMMAND_RETRY_BUTTON &&
              interaction2.user.id === ids.get(PARTIES.SENDER)
            ) {
              end();
              handleFriendRequest();
            }
          });
        }
      }
    };
    await handleAccountSelection();
    await handleFriendRequest();
  }
}
