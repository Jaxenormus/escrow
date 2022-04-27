import { container } from '@sapphire/framework';
import { filter } from 'async';
import { Promise } from 'bluebird';
import { Message, MessageActionRow, MessageButton, TextBasedChannel } from 'discord.js';
import interval from 'interval-promise';
import { isEmpty, random } from 'lodash';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, EMOJIS, INTERACTIONS, TRADE_TYPES } from '@/context';
import Account from '@/entities/Account';
import Queue from '@/entities/Queue';
import Ticket from '@/entities/Ticket';

import handleInteractions from '../../core/handleInteractions';
import handleRobloxRequest from '../../limiteds/handleRobloxRequest';
import handleTradeTermination from './handleDealTermination';

export default async function handleAccountSelection(
  channel: TextBasedChannel,
  ids: Identities,
  type: TRADE_TYPES.LIMITEDS | TRADE_TYPES.ADOPT_ME | TRADE_TYPES.HOOD_MODDED
): Promise<string> {
  const disclaimer = await channel.send({
    embeds: [
      new Embed({
        title: `${EMOJIS.LOADING} Finding position in queue`,
        description: 'Please wait while we find your position in the queue.',
        color: COLORS.WARNING,
      }),
    ],
  });

  const findAccount = () =>
    new Promise<string>((resolve, reject) => {
      let stopped = false;
      const stopSearch = () => {
        stopped = true;
      };
      // eslint-disable-next-line consistent-return
      const findAccountHandler = async (): Promise<string | void> => {
        const rawAccounts = await container.db.em.find(Account, {
          type,
          tickets: { $eq: null },
          hasJoinedServer: type !== TRADE_TYPES.LIMITEDS,
          server: { $exists: type !== TRADE_TYPES.LIMITEDS },
        });
        const accounts = await filter(rawAccounts, async account => {
          const userInstance = await handleRobloxRequest(account);
          return userInstance
            .get('https://users.roblox.com/v1/users/authenticated')
            .then(() => true)
            .catch(e => {
              container.sentry.handleException(e);
              return false;
            });
        });
        if (!isEmpty(accounts)) {
          return accounts[random(0, accounts.length - 1)].id;
        }
      };
      handleTradeTermination(channel, e => {
        stopSearch();
        reject(e);
      });
      findAccountHandler().then(accountId => {
        if (accountId) {
          resolve(accountId);
        } else {
          interval(async (_, stop) => {
            if (stopped) stop();
            const accountId2 = await findAccountHandler();
            if (accountId2) {
              resolve(accountId2);
              stopSearch();
              stop();
            }
          }, 10000);
        }
      });
    });

  const findPosition = async (message: Message, iterator: number, end?: any): Promise<string> => {
    const queue = await container.db.em.find(Queue, { type });
    queue.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const position = queue.findIndex(q => q.id === channel.id);
    await message.edit({
      ...(position === 0 && iterator > 0 ? { content: ids.mention() } : {}),
      embeds: [
        new Embed({
          title: `${EMOJIS.LOADING} ${
            position === 0 ? 'You are now first in the queue' : `Queue position: ${position + 1}`
          }`,
          description:
            position === 0
              ? 'You are first in the queue, please wait until an account is available to use.'
              : 'Due to high demand you have been placed in a queue and will need to wait for an available slot.',
          color: COLORS.WARNING,
        }),
      ],
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId(INTERACTIONS.LIMITEDS_QUEUE_CANCEL_BUTTON)
            .setLabel('Cancel')
            .setStyle('DANGER')
        ),
      ],
    });
    handleInteractions(
      message,
      async interaction => {
        if (interaction.customId === INTERACTIONS.LIMITEDS_QUEUE_CANCEL_BUTTON) {
          await message.channel.send('$close');
          if (end) end();
        }
      },
      { componentType: 'BUTTON' }
    );
    if (position === 0) {
      const selected = await findAccount();
      const ticket = container.db.em.create(Ticket, {
        account: selected,
        id: channel.id,
        type,
      });
      await container.db.em.persistAndFlush(ticket);
      const queuePosition = await container.db.em.findOne(Queue, channel.id);
      await container.db.em.removeAndFlush(queuePosition);
      await message.delete();
      if (end) end();
      return selected;
    }
    return null;
  };
  const queuePosition = container.db.em.create(Queue, { id: channel.id, type });
  await container.db.em.persistAndFlush(queuePosition);
  const foundAccount = await findPosition(disclaimer, 0);
  if (foundAccount) return foundAccount;
  return new Promise((resolve, reject) => {
    let stopped = false;
    handleTradeTermination(channel, e => {
      stopped = true;
      reject(e);
    });
    interval(async (i, end) => {
      if (stopped) end();
      const account = await findPosition(disclaimer, i, end);
      if (account) {
        end();
        resolve(account);
      }
    }, 10000);
  });
}
