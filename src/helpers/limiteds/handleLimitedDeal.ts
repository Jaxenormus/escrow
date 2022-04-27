import { TextBasedChannel } from 'discord.js';
import { ceil, sumBy } from 'lodash';

import Embed from '@/classes/Embed';
import Trade from '@/classes/Trade';
import { COLORS, PARTIES, RESPONSES, TRADE_TYPES } from '@/context';
import handleQuestion from '@/helpers/core/handleQuestion';
import handleTradeSelection from '@/helpers/limiteds/handleTradeSelection';
import handleAccountSelection from '@/helpers/shared/handlers/handleAccountSelection';
import handleDealCleanup from '@/helpers/shared/handlers/handleDealCleanup';
import handleDealConfirmation from '@/helpers/shared/handlers/handleDealConfirmation';
import handleIdentification from '@/helpers/shared/handlers/handleIdentification';
import handlePlayerSelection from '@/helpers/shared/handlers/handlePlayerSelection';

import handleDealCancelation from '../shared/handlers/handleDealCancelation';

// import handleFeeCollection from '../fee/handleFeeCollection';

export default async function handleLimiteds(channel: TextBasedChannel) {
  const ids = await handleIdentification(channel, TRADE_TYPES.LIMITEDS);
  // await handleFeeCollection(channel, ids);
  const account = await handleAccountSelection(channel, ids, TRADE_TYPES.LIMITEDS);
  const trades: Trade[] = [];
  const handleItemCollection = async () => {
    const trade = await handleTradeSelection(
      channel,
      account,
      ids,
      PARTIES.SENDER,
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      trades.length > 0 ? { handleBackButton: () => handleTrade() } : {}
    );
    trades.push(trade);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    await handleTrade();
  };
  const handleTrade = async () => {
    const [promptMessage, { allConfirmed: additionalTrades }] = await handleQuestion(
      channel,
      {
        content: ids.mention(PARTIES.SENDER),
        embeds: [
          new Embed({
            title: 'Are there more items?',
            description: `Are there any more items you need to send to the bot?`,
          }),
        ],
      },
      [ids.sender],
      RESPONSES.SIMPLE
    );
    await promptMessage.delete();
    if (additionalTrades) {
      await handleItemCollection();
    } else {
      const verdict = await handleDealConfirmation(TRADE_TYPES.LIMITEDS, channel, ids);
      if (verdict === 'RELEASE') {
        const { id: senderId } = await handlePlayerSelection(
          TRADE_TYPES.LIMITEDS,
          channel,
          ids,
          PARTIES.RECEIVER
        );

        // eslint-disable-next-line no-restricted-syntax
        for (const id in Array(ceil(sumBy(trades, t => t.receiving.items.length) / 4)).fill(0)) {
          if (id) {
            // eslint-disable-next-line no-await-in-loop
            await handleTradeSelection(channel, account, ids, PARTIES.RECEIVER, {
              senderId,
              singleConfirmation: true,
            });
          }
        }
        await channel.send({
          content: ids.mention(),
          embeds: [
            new Embed({
              title: 'Deal completed',
              description: `We hope you enjoyed our service, if you did feel free to leave a vouch in <#${process.env.VOUCH_CHANNEL_ID}>`,
              color: COLORS.SUCCESS,
            }),
          ],
        });
        const value = trades.reduce(
          (acc, trade) =>
            acc + trade.receiving.value === 0 ? trade.receiving.rap : trade.receiving.value,
          0
        );
        await handleDealCleanup(channel, ids, TRADE_TYPES.LIMITEDS, value);
      } else if (verdict === 'CANCEL' || verdict === 'RETURN') {
        await handleDealCancelation({
          channel,
          ids,
          type: TRADE_TYPES.LIMITEDS,
          account,
          trades,
          staffConfNeeded: verdict === 'CANCEL',
        });
      }
    }
  };
  await handleItemCollection();
}
