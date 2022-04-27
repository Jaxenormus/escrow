import { Formatters, MessageActionRow, MessageButton, TextBasedChannel } from 'discord.js';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import {
  COLORS,
  EXPANDED_TRADE_TYPES,
  INTERACTIONS,
  PARTIES,
  RESPONSES,
  TRADE_TYPES,
} from '@/context';
import AdminOnlyPrecondition from '@/preconditions/roles/adminOnly';

import handleInteractions from '../../core/handleInteractions';
import handleQuestion from '../../core/handleQuestion';

export default async function handleIdentification(
  channel: TextBasedChannel,
  type: TRADE_TYPES
): Promise<Identities> {
  const identities = new Identities();
  const identificationEmbed = new Embed({
    title: 'Trade Participant Identification',
    description:
      'Click the button that corresponds to your role in this trade to properly middleman it. Once both parties have decided on their roles, confirm your choices to proceed.',
    fields: [
      { name: `Sending ${EXPANDED_TRADE_TYPES[type]}`, value: '`None`', inline: true },
      { name: `Receiving ${EXPANDED_TRADE_TYPES[type]}`, value: '`None`', inline: true },
    ],
  });
  const identification = await channel.send({
    embeds: [identificationEmbed],
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setLabel(`Sending ${EXPANDED_TRADE_TYPES[type]}`)
          .setStyle('SECONDARY')
          .setCustomId(INTERACTIONS.PARTY_IDENTIFICATION_SENDING_BUTTON),
        new MessageButton()
          .setLabel(`Receiving ${EXPANDED_TRADE_TYPES[type]}`)
          .setStyle('SECONDARY')
          .setCustomId(INTERACTIONS.PARTY_IDENTIFICATION_RECEIVING_BUTTON),
        new MessageButton()
          .setLabel('Reset')
          .setStyle('DANGER')
          .setCustomId(INTERACTIONS.PARTY_IDENTIFICATION_RESET_BUTTON)
      ),
    ],
  });
  await handleInteractions(
    identification,
    async (i, end) => {
      if (i.customId === INTERACTIONS.PARTY_IDENTIFICATION_RESET_BUTTON) {
        identities.set(PARTIES.SENDER, null);
        identities.set(PARTIES.RECEIVER, null);
        await identification.edit({
          embeds: [
            identification.embeds[0].setFields([
              {
                name: `Sending ${EXPANDED_TRADE_TYPES[type]}`,
                value: Formatters.inlineCode('None'),
                inline: true,
              },
              {
                name: `Receiving ${EXPANDED_TRADE_TYPES[type]}`,
                value: Formatters.inlineCode('None'),
                inline: true,
              },
            ]),
          ],
        });
      } else {
        const role =
          // eslint-disable-next-line no-nested-ternary
          i.customId === INTERACTIONS.PARTY_IDENTIFICATION_SENDING_BUTTON
            ? PARTIES.SENDER
            : PARTIES.RECEIVER;
        const isAdmin = await AdminOnlyPrecondition.isAdmin(i.user.id);
        if (
          (identities.get(PARTIES.SENDER) === i.user.id ||
            identities.get(PARTIES.RECEIVER) === i.user.id) &&
          !isAdmin
        ) {
          await i.followUp({
            embeds: [
              new Embed({
                description: 'You have already selected a role for this trade.',
                color: COLORS.ERROR,
              }),
            ],
            ephemeral: true,
          });
          return;
        }
        identities.set(role, i.user.id);
        const sender = identities.get(PARTIES.SENDER);
        const receiver = identities.get(PARTIES.RECEIVER);
        await identification.edit({
          embeds: [
            identification.embeds[0].setFields([
              {
                name: `Sending ${EXPANDED_TRADE_TYPES[type]}`,
                value: sender ? identities.mention(PARTIES.SENDER) : Formatters.inlineCode('None'),
                inline: true,
              },
              {
                name: `Receiving ${EXPANDED_TRADE_TYPES[type]}`,
                value: receiver
                  ? identities.mention(PARTIES.RECEIVER)
                  : Formatters.inlineCode('None'),
                inline: true,
              },
            ]),
          ],
        });
        if (identities.valid()) {
          end();
        }
      }
    },
    { componentType: 'BUTTON' }
  );
  await identification.delete();
  const [confirmation, { allConfirmed: identityConfirmation }] = await handleQuestion(
    channel,
    identification.embeds[0]
      .setTitle('Confirm role selection')
      .setDescription('Both parties have selected their roles. Are these correct?'),
    identities.both,
    RESPONSES.SIMPLE,
    { acknowledgeResponse: true }
  );
  if (!identityConfirmation) {
    await confirmation.delete();
    return handleIdentification(channel, type);
  }
  await confirmation.edit({
    embeds: [
      confirmation.embeds[0]
        .setTitle('Identities Confirmed')
        .setDescription('Both parties have selected their roles and confirmed their choices')
        .setColor(COLORS.SUCCESS),
    ],
    components: [],
  });
  return identities;
}
