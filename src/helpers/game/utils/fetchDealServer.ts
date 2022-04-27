import { container } from '@sapphire/framework';
import { TextBasedChannel } from 'discord.js';

import Ticket from '@/entities/Ticket';

export default async function fetchDealServer(channel: TextBasedChannel) {
  const trade = await container.db.em.findOne(Ticket, { id: channel.id });
  return trade.server.id ?? null;
}
