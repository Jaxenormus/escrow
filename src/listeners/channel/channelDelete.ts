import { Listener } from '@sapphire/framework';
import { GuildChannel } from 'discord.js';

import { TRADE_EVENTS } from '@/context';
import GameDeal from '@/entities/GameDeal';
import Queue from '@/entities/Queue';
import Ticket from '@/entities/Ticket';

export default class ChannelDeleteListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'channelDelete',
    });
  }

  public async run(channel: GuildChannel) {
    if (channel.isText()) {
      // @ts-expect-error - This does work, but TS doesn't like it.
      process.emit(channel.id, TRADE_EVENTS.TERMINATED);
      const ticket = await this.container.db.em.findOne(Ticket, channel.id);
      const queue = await this.container.db.em.findOne(Queue, channel.id);
      const deal = await this.container.db.em.findOne(GameDeal, channel.id);
      if (deal) (await deal.trades.init()).removeAll();
      if (ticket) this.container.db.em.remove(ticket);
      if (queue) this.container.db.em.remove(queue);
      await this.container.db.em.flush();
    }
  }
}
