import { Formatters, TextBasedChannel } from 'discord.js';
import { CryptoDealAmount } from 'index';
import { isNil } from 'lodash';
import { parseFirst } from 'price-parser';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, PARTIES, REPLY_DELETE_TIMEOUT, RESPONSES, TRADE_TYPES } from '@/context';

import handleMessage from '../core/handleMessage';
import handleQuestion from '../core/handleQuestion';
import formatFiatValue from '../shared/formatFiatValue';
import findCoinAmount from './utils/findCoinAmount';
import findFiatAmount from './utils/findFiatAmount';

export default async function handleAmountSelection(
  channel: TextBasedChannel,
  ids: Identities,
  coin: TRADE_TYPES
): Promise<CryptoDealAmount> {
  const embedMessage = await channel.send({
    content: ids.mention(PARTIES.RECEIVER),
    embeds: [
      new Embed()
        .setTitle(`What is the amount you want to receive in USD?`)
        .setDescription(
          `Please enter how much USD you would like to receive so that the amount of ${coin} ${Formatters.userMention(
            ids.sender
          )} needs to send can be appropriately calculated.`
        ),
    ],
  });
  const { content: rawAmount } = await handleMessage(channel, async (m, end) => {
    if (m.author.id === ids.receiver) {
      const input = parseFirst(`${m.content} USD`);
      if (isNil(input)) {
        const msg = await m.reply('Please enter a valid number.');
        setTimeout(() => msg.delete(), REPLY_DELETE_TIMEOUT);
      } else {
        await embedMessage.delete();
        await m.delete();
        end();
      }
    }
  });
  const amount = parseFirst(`${rawAmount} USD`);
  const [confirmationMessage, { allConfirmed }] = await handleQuestion(
    channel,
    {
      content: ids.mention(),
      embeds: [
        new Embed()
          .setTitle('Is this information correct?')
          .setDescription('Make sure all the information below is correct before continuing.')
          .addFields([
            {
              name: 'USD Amount',
              value: `${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: amount.currencyCode,
              }).format(amount.floatValue)}`,
            },
          ])
          .setFooter({ text: 'Both parties must confirm this message to continue.' }),
      ],
    },
    ids.both,
    RESPONSES.SIMPLE,
    { acknowledgeResponse: true }
  );
  if (allConfirmed) {
    await confirmationMessage.edit({
      embeds: [
        new Embed()
          .setTitle('Information Confirmed')
          .setDescription(`The following information has been confirmed by both parties`)
          .addFields(confirmationMessage.embeds[0].fields)
          .setColor(COLORS.SUCCESS),
      ],
      components: [],
    });
    const cryptoAmount = await findCoinAmount(coin, amount.floatValue);
    const fiatAmount = await findFiatAmount(coin, cryptoAmount.toString());
    return {
      raw_fiat: fiatAmount,
      fiat: formatFiatValue(fiatAmount),
      raw_crypto: cryptoAmount,
      crypto: cryptoAmount.toFixed(8),
    };
  }
  await confirmationMessage.delete();
  return handleAmountSelection(channel, ids, coin);
}
