import { container } from '@sapphire/framework';
import { Formatters, MessageAttachment, TextBasedChannel } from 'discord.js';
import { toLower } from 'lodash';
import path from 'path';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, PARTIES, REPLY_DELETE_TIMEOUT, RESPONSES, TRADE_TYPES } from '@/context';

import handleMessage from '../core/handleMessage';
import handleQuestion from '../core/handleQuestion';
import findAddressUrl from './utils/findAddressUrl';

export default async function handleAddyCollection(
  channel: TextBasedChannel,
  ids: Identities,
  coin: TRADE_TYPES,
  party: PARTIES
): Promise<string> {
  const embedMessage = await channel.send({
    content: ids.mention(party),
    embeds: [
      new Embed()
        .setTitle(`What is your ${coin} address?`)
        .setDescription(
          `To ensure that we send the ${coin} to the correct address, please provide your ${coin} address`
        ),
    ],
  });
  const { content } = await handleMessage(channel, async (m, end) => {
    if (m.author.id === ids.get(party)) {
      container
        .blockcypher(coin)
        .get(`/addrs/${m.content}`)
        .then(async res => {
          if (res.data) await embedMessage.delete();
          await m.delete();
          end();
        })
        .catch(async () => {
          const msg = await m.reply(`That is not a valid ${coin} address.`);
          setTimeout(() => msg.delete(), REPLY_DELETE_TIMEOUT);
        });
    }
  });
  const [message, { allConfirmed }] = await handleQuestion(
    channel,
    {
      embeds: [
        new Embed()
          .setTitle(`Is this your ${coin} address?`)
          .setDescription(
            'Insure that the address you put is correct, we will not be able to recover your funds if you send it too the wrong address.'
          )
          .addFields([
            {
              name: 'Address',
              value: Formatters.hyperlink(content, findAddressUrl(coin, content)),
            },
          ])
          .setColor(COLORS.WARNING),
      ],
    },
    [ids.get(party)],
    RESPONSES.SIMPLE
  );
  await message.delete();
  if (!allConfirmed) {
    await embedMessage.delete();
    return handleAddyCollection(channel, ids, coin, party);
  }
  await channel.send({
    embeds: [
      new Embed()
        .setTitle(`${coin} address confirmed`)
        .setDescription(`This address has been confirmed by the ${toLower(party)}`)
        .setColor(COLORS.SUCCESS)
        .addFields([
          {
            name: 'Address',
            value: Formatters.hyperlink(content, findAddressUrl(coin, content)),
          },
        ])
        .setThumbnail('attachment://confirmed.png'),
    ],
    files: [
      new MessageAttachment(
        path.join(__dirname, `../../assets/images/crypto/${toLower(coin)}-confirmed.png`),
        'confirmed.png'
      ),
    ],
  });
  return content;
}
