import { container } from '@sapphire/framework';
import { TextBasedChannel } from 'discord.js';

import Identities from '@/classes/Identities';
import { GAME_TRADE_TYPES, PARTIES } from '@/context';
import GameTrade, { TRADE_STATUS } from '@/entities/GameTrade';

import handleDealCancelation from '../shared/handlers/handleDealCancelation';
import handleDealCleanup from '../shared/handlers/handleDealCleanup';
import handleDealConfirmation from '../shared/handlers/handleDealConfirmation';
import handleGameDealRelease from './handleGameDealRelease';

export default async function handleGameDealCompletion(
  channel: TextBasedChannel,
  ids: Identities,
  accountId: string,
  type: GAME_TRADE_TYPES
) {
  const [, count] = await container.db.em.findAndCount(GameTrade, {
    deal: channel.id,
    status: TRADE_STATUS.ACCEPTED,
  });

  const verdict = await handleDealConfirmation(type, channel, ids);
  if (verdict === 'RELEASE') {
    await handleGameDealRelease(channel, ids, type, PARTIES.RECEIVER);
    await handleDealCleanup(channel, ids, type, count);
  } else if (verdict === 'CANCEL' || verdict === 'RETURN') {
    await handleDealCancelation({
      channel,
      ids,
      account: accountId,
      type,
      staffConfNeeded: verdict === 'CANCEL',
    });
  }
}
