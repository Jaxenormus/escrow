import { each, Promise } from 'bluebird';
import {
  Formatters,
  Message,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessageOptions,
  TextBasedChannel,
} from 'discord.js';
import { isEmpty } from 'lodash';

import Embed from '@/classes/Embed';
import { COLORS, INTERACTIONS } from '@/context';
import AdminOnlyPrecondition from '@/preconditions/roles/adminOnly';

import handleInteractions from './handleInteractions';

async function handleQuestion(
  channel: TextBasedChannel,
  message: MessageOptions | Embed,
  respondents: string[],
  buttons: { CONFIRM: string; DENY: string },
  options?: {
    denyIsConfirm?: boolean;
    staffOverridable?: boolean;
    acknowledgeResponse?: boolean;
    dangerousActions?: boolean;
  }
): Promise<[Message, { allConfirmed: boolean; confirmations: Map<string, boolean> }]> {
  const confirmations = new Map(respondents.map(id => [id, undefined]));
  const msg = await channel.send({
    ...(message instanceof MessageEmbed ? { embeds: [message] } : { ...message }),
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(INTERACTIONS.CONFIRMATIONS_CONFIRM_BUTTON)
          .setStyle(options?.dangerousActions ? 'SUCCESS' : 'PRIMARY')
          .setLabel(buttons.CONFIRM),
        new MessageButton()
          .setCustomId(INTERACTIONS.CONFIRMATIONS_DENY_BUTTON)
          .setStyle(options?.dangerousActions ? 'DANGER' : 'SECONDARY')
          .setLabel(buttons.DENY)
      ),
    ],
  });
  const messages = [];
  await handleInteractions(
    msg,
    async (i, end) => {
      const isParticipant = confirmations.has(i.user.id);
      const isConfirm = i.customId === INTERACTIONS.CONFIRMATIONS_CONFIRM_BUTTON;
      const isAdmin = AdminOnlyPrecondition.isAdmin(i.user.id);
      const response = isConfirm ? buttons.CONFIRM : buttons.DENY;
      if (options?.staffOverridable && isAdmin && !isParticipant) {
        await each(confirmations.keys(), id => confirmations.set(id, isConfirm));
        await channel.send({
          embeds: [
            new Embed({
              description: `${Formatters.userMention(
                i.user.id
              )} has overridden the confirmation with the response "${response}"`,
              color: isConfirm ? COLORS.SUCCESS : COLORS.ERROR,
            }),
          ],
        });
        end();
      } else if (isParticipant) {
        if (options?.acknowledgeResponse) {
          const onmsg = await channel.send({
            embeds: [
              new Embed({
                description: `${Formatters.userMention(i.user.id)} has responded "${response}"`,
                color: isConfirm ? COLORS.SUCCESS : COLORS.ERROR,
              }),
            ],
          });
          messages.push(onmsg);
        }
        if (isConfirm) {
          if (options?.denyIsConfirm) {
            end();
          } else {
            confirmations.set(i.user.id, true);
          }
        } else if (!isConfirm) {
          if (options?.denyIsConfirm) {
            confirmations.set(i.user.id, true);
          } else {
            end();
          }
        }
      }
      if (Array.from(confirmations.values()).every(c => c)) end();
    },
    { componentType: 'BUTTON' }
  );
  if (options?.acknowledgeResponse) {
    await new Promise(resolve => {
      if (isEmpty(messages)) resolve();
      each(messages, async m => {
        m.delete().then(() => {
          if (messages.indexOf(m) === messages.length - 1) {
            resolve(undefined);
          }
        });
      });
    });
  }
  return [msg, { allConfirmed: Array.from(confirmations.values()).every(c => c), confirmations }];
}

export default handleQuestion;
