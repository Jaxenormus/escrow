import { Formatters, MessageActionRow, MessageButton, TextBasedChannel } from 'discord.js';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, INTERACTIONS } from '@/context';

import handleInteractions from '../core/handleInteractions';

export default async function handleGameLaunchFailure(channel: TextBasedChannel, ids: Identities) {
  const msg = await channel.send({
    content: ids.mention(),
    embeds: [
      new Embed()
        .setTitle('Failed to join game')
        .setDescription(
          'The bot was unable to join the game. This may be due to an issue with the roblox launcher. Please close the ticket and try again.'
        )
        .setColor(COLORS.ERROR),
    ],
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(INTERACTIONS.TICKET_CLOSE_BUTTON)
          .setLabel('Close')
          .setStyle('DANGER')
      ),
    ],
  });
  await handleInteractions(
    msg,
    async interaction => {
      await interaction.reply({
        embeds: [
          new Embed()
            .setTitle('Ticket Closed')
            .setDescription(
              `This ticket has been closed by ${Formatters.userMention(interaction.user.id)}.`
            )
            .setColor(COLORS.SUCCESS),
        ],
        components: [],
      });
      await channel.send('$close');
    },
    { max: 1, filter: i => i.customId === INTERACTIONS.TICKET_CLOSE_BUTTON },
    { avoidUpdate: true }
  );
}
