import { container } from '@sapphire/framework';
import axios from 'axios';
import { Promise } from 'bluebird';
import { TextBasedChannel } from 'discord.js';
import { has, omit } from 'lodash';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, PARTIES, REPLY_DELETE_TIMEOUT, RESPONSES, TRADE_TYPES } from '@/context';
import EarlyTerminationError from '@/errors/EarlyTerminationError';

import handleQuestion from '../../core/handleQuestion';
import findRobloxHeadShot from '../findRobloxHeadShot';

export default async function handlePlayerSelection(
  type: TRADE_TYPES,
  channel: TextBasedChannel,
  ids: Identities,
  party: PARTIES,
  options?: { cleanUp?: boolean; isStaff?: boolean; usernameToFind?: string }
): Promise<{ id: number; name: string }> {
  let username = options?.usernameToFind;
  let msg = null;
  if (!username) {
    msg = await channel.send({
      content: ids.mention(party),
      embeds: [
        new Embed({
          title: options?.isStaff
            ? 'What is the username or profile link of the sender?'
            : 'What is your username or profile link?',
          description:
            // eslint-disable-next-line no-nested-ternary
            type === TRADE_TYPES.LIMITEDS
              ? options?.isStaff
                ? 'We need their username to ensure we show you the right trade'
                : 'We need your username to ensure that we show you the right trade.'
              : 'We need your username to ensure we can find you in game.',
        }),
      ],
    });
    username = await new Promise<string>((resolve, reject) => {
      channel
        .createMessageCollector({
          max: 1,
          filter: m => m.author.id === ids.get(party),
        })
        .on('end', async (collected, reason) => {
          if (reason !== 'channelDelete') {
            await collected.first().delete();
            resolve(collected.first().content);
          } else {
            reject(new EarlyTerminationError(channel.id));
          }
        });
    });
  }
  const isLink = username.match(/^https:\/\/www.roblox.com\/users\/([0-9]+)\/profile$/);
  const results = await Promise.all([
    axios
      .get('https://www.rolimons.com/api/playersearch', {
        params: { searchstring: username },
      })
      .then(({ data }) => data)
      .catch(e => e.response.data),
    axios
      .get('https://users.roblox.com/v1/users/search', { params: { keyword: username } })
      .then(({ data }) => data)
      .catch(e => e.response.data),
  ]);
  const accounts = [
    ...(has(results[1], 'data') ? results[1].data.map(({ id, name }) => [id, name, 0]) : []),
    ...(has(results[0], 'players') ? results[0].players : []),
  ];
  try {
    const uid = isLink ? parseInt(isLink[1], 10) : accounts[0][0];
    const usernameReq = await container.api.get(`https://users.roblox.com/v1/users/${uid}`);
    const name = await usernameReq.data.name;
    if (msg) await msg.delete();
    const [question, { allConfirmed: accountConfirmation }] = await handleQuestion(
      channel,
      {
        content: ids.mention(party),
        embeds: [
          new Embed({
            title: options?.isStaff ? 'Is this their account?' : 'Is this your account?',
            fields: [
              { name: 'Username', value: name },
              {
                name: 'Profile URL',
                value: `https://www.roblox.com/users/${uid}/profile`,
              },
            ],
            thumbnail: { url: await findRobloxHeadShot(uid) },
          }),
        ],
      },
      [ids.get(party)],
      RESPONSES.SIMPLE
    );
    await question.delete();
    if (accountConfirmation) {
      if (!options?.cleanUp) {
        await channel.send({
          embeds: [
            new Embed()
              .setTitle('Account Confirmed')
              .setDescription('The following account has been selected and confirmed')
              .addFields(
                { name: 'Username', value: name },
                { name: 'Profile URL', value: `https://www.roblox.com/users/${uid}/profile` }
              )
              .setThumbnail(await findRobloxHeadShot(uid))
              .setColor(COLORS.SUCCESS),
          ],
        });
      }
      return { id: uid, name };
    }
    return await handlePlayerSelection(type, channel, ids, party, omit(options, 'usernameToFind'));
  } catch (e) {
    container.sentry.handleException(e);
    const msg2 = await channel.send({
      embeds: [
        new Embed()
          .setTitle('Unable to find account')
          .setDescription('Unable to find account, please try again')
          .setColor(COLORS.ERROR),
      ],
    });
    if (msg) await msg.delete();
    setTimeout(() => msg2.delete(), REPLY_DELETE_TIMEOUT);
    return handlePlayerSelection(type, channel, ids, party, options);
  }
}
