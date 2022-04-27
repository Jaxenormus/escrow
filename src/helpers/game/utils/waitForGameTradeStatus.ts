import { container } from '@sapphire/framework';
import { TextBasedChannel } from 'discord.js';
import interval from 'interval-promise';

import { GAME_TRADE_STATUSES } from '@/context';
import GameDeal from '@/entities/GameDeal';

import handleDealTermination from '../../shared/handlers/handleDealTermination';

export default async function waitForGameTradeStatus(
  channel: TextBasedChannel,
  target: GAME_TRADE_STATUSES
) {
  return new Promise(resolve => {
    let stopped = false;
    handleDealTermination(channel, () => {
      stopped = true;
    });
    interval(async (_, stop) => {
      if (stopped) stop();
      const deal = await container.db.em.findOne(GameDeal, channel.id);
      if (deal && deal.status === target) {
        stop();
        resolve(undefined);
      }
    }, 5000);
  });
}
