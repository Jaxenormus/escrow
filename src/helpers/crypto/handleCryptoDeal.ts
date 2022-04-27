import { container } from '@sapphire/framework';
import { TextBasedChannel } from 'discord.js';

import Embed from '@/classes/Embed';
import { COLORS, CRYPTO_TRADE_TYPES, PARTIES } from '@/context';
import Ticket from '@/entities/Ticket';
import handleAmountSelection from '@/helpers/crypto/handleAmountSelection';
import handleDeposit from '@/helpers/crypto/handleDeposit';
import handleDealCleanup, {
  handleTicketStatistics,
} from '@/helpers/shared/handlers/handleDealCleanup';
import handleDealConfirmation from '@/helpers/shared/handlers/handleDealConfirmation';
import handleIdentification from '@/helpers/shared/handlers/handleIdentification';

import handleDealCancelation from '../shared/handlers/handleDealCancelation';
import handleAddyCollection from './handleAddyCollection';
import handleRelease from './handleRelease';

// import handleFeeCollection from '../fee/handleFeeCollection';

export default async function handleCrypto(channel: TextBasedChannel, coin: CRYPTO_TRADE_TYPES) {
  const ids = await handleIdentification(channel, coin);
  // await handleFeeCollection(channel, ids);
  const ticket = container.db.em.create(Ticket, { id: channel.id, type: coin });
  await container.db.em.persistAndFlush(ticket);
  const amount = await handleAmountSelection(channel, ids, coin);
  const { botAddress } = await handleDeposit(channel, ids, coin, amount);
  const verdict = await handleDealConfirmation(coin, channel, ids);
  if (verdict === 'RELEASE') {
    const receiverAddress = await handleAddyCollection(channel, ids, coin, PARTIES.RECEIVER);
    await channel.send({
      content: ids.mention(),
      embeds: [
        new Embed({
          title: 'Deal completed. Releasing funds.',
          description: `We hope you enjoyed our service, if you did feel free to leave a vouch in <#${process.env.VOUCH_CHANNEL_ID}>`,
          color: COLORS.SUCCESS,
        }),
      ],
    });
    await handleTicketStatistics(channel, ids, coin, amount.raw_fiat);
    await handleRelease(coin, channel, receiverAddress, botAddress, ids, PARTIES.RECEIVER);
    await handleDealCleanup(channel, ids, coin, amount.raw_fiat, true);
  } else if (verdict === 'CANCEL' || verdict === 'RETURN') {
    await handleDealCancelation({
      ids,
      type: coin,
      channel,
      staffConfNeeded: verdict === 'CANCEL',
    });
  }
}
