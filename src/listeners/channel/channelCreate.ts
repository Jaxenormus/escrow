import { container, Listener } from '@sapphire/framework';
import { Formatters, GuildChannel } from 'discord.js';
import { isNil, lowerCase, toLower } from 'lodash';

import Embed from '@/classes/Embed';
import { REPLY_DELETE_TIMEOUT, TRADE_TYPES } from '@/context';
import handleMessage from '@/helpers/core/handleMessage';
import handleCoinSelect from '@/helpers/crypto/handleCoinSelection';
import handleCrypto from '@/helpers/crypto/handleCryptoDeal';
import handleGameDeal from '@/helpers/game/handleGameDeal';
import handleLimiteds from '@/helpers/limiteds/handleLimitedDeal';
import handleInactivity from '@/helpers/shared/handlers/handleInactivity';

export default class ChannelCreateListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'channelCreate',
    });
  }

  public async run(channel: GuildChannel) {
    try {
      const matches = channel.name.match(/^(.+)-([0-9]+)$/);
      if (!isNil(matches) && channel.isText()) {
        const type = TRADE_TYPES[matches[1].replace('-', '_').toUpperCase()];
        if (isNil(type)) return;
        handleInactivity(channel);
        await channel.send({
          embeds: [
            new Embed({
              title: 'Escrow Automated Middleman',
              description: `Please enter the tag  or Developer ID of the user you are dealing with.\n\ne.g User#0000 or 12345678901234567`,
            }),
          ],
        });
        await handleMessage(channel, async (response, end) => {
          if (!response.author.bot) {
            const idTest = /^[0-9]{17,}$/.test(response.content);
            const tagTest = /^.+#[0-9]{4}$/gi.test(response.content);
            if (idTest || tagTest) {
              try {
                let id = null;
                if (idTest) {
                  const member = await response.guild.members.fetch(response.content);
                  id = member.id;
                } else {
                  const user = (await response.guild.members.fetch()).find(
                    member => member.user.tag === response.content
                  );
                  if (isNil(user)) throw new Error('User not found.');
                  id = user.id;
                }
                if (!isNil(id)) {
                  await response.channel.send(`$add ${id}`);
                  await response.channel.send(
                    `${Formatters.userMention(id)} You have been added to a ${toLower(
                      type
                    )} ticket by ${Formatters.userMention(response.author.id)}`
                  );
                }
                end();
              } catch (e) {
                const msg = await response.reply('The user is not in the server.');
                setTimeout(() => msg.delete(), REPLY_DELETE_TIMEOUT);
              }
            } else {
              const msg = await response.reply('Please enter a valid user ID.');
              setTimeout(() => msg.delete(), REPLY_DELETE_TIMEOUT);
            }
          }
        });

        // eslint-disable-next-line default-case
        switch (type) {
          case TRADE_TYPES.LIMITEDS: {
            await handleLimiteds(channel);
            break;
          }
          case TRADE_TYPES.ADOPT_ME:
          case TRADE_TYPES.HOOD_MODDED: {
            await handleGameDeal(channel, type);
            break;
          }
          case TRADE_TYPES.CRYPTO: {
            const selection = await handleCoinSelect(
              channel,
              'What coin is being held?',
              'Please select the coin you would like to hold during the exchange.'
            );
            await channel.send(`$rename ${lowerCase(selection)}-${matches[2]}`);
            await handleCrypto(channel, selection as any);
            break;
          }
        }
      }
    } catch (e) {
      container.sentry.handleException(e);
    }
  }
}
