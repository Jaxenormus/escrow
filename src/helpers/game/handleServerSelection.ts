import { container } from '@sapphire/framework';
import { random } from 'lodash';

import { TRADE_TYPES } from '@/context';
import Server from '@/entities/Server';

export default async function handleServerSelection(type: TRADE_TYPES) {
  const servers = await container.db.em.find(Server, { type, tickets: { $eq: null } });
  return servers[random(0, servers.length - 1)].id;
}
