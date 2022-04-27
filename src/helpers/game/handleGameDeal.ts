import { TextBasedChannel } from 'discord.js';

import { GAME_TRADE_TYPES } from '@/context';

import handleGameDealCompletion from './handleGameDealCompletion';
import handleGameDealStart from './handleGameDealStart';
import handleGameDealTrade from './handleGameDealTrade';

export default async function handleGameDeal(channel: TextBasedChannel, type: GAME_TRADE_TYPES) {
  const { ids, account, game } = await handleGameDealStart(channel, type);
  await handleGameDealTrade(channel, ids, type, account.server.id, game);
  await handleGameDealCompletion(channel, ids, account.server.id, type);
}
