import { container } from '@sapphire/framework';
import { TextBasedChannel } from 'discord.js';

import Identities from '@/classes/Identities';
import { TRADE_TYPES } from '@/context';
import Statistics from '@/entities/Statistics';

import assignMemberRole from '../assignMemberRole';

export async function handleStatisticsUpdate(
  type: TRADE_TYPES,
  userId: string,
  amount: number,
  isSender: boolean,
  isCrypto: boolean
) {
  const old = await container.db.em.findOne(Statistics, userId);
  return container.db.em.upsert(Statistics, {
    id: userId,
    ...(type === TRADE_TYPES.LIMITEDS
      ? {
          limitedsCount: (old?.limitedsCount ?? 0) + 1,
          ...(isSender
            ? { limitedsSent: (old?.limitedsSent ?? 0) + amount }
            : { limitedsReceived: (old?.limitedsReceived ?? 0) + amount }),
        }
      : {}),
    ...(isCrypto
      ? {
          cryptoCount: (old?.cryptoCount ?? 0) + 1,
          ...(isSender
            ? { cryptoSent: (old?.cryptoSent ?? 0) + amount }
            : { cryptoReceived: (old?.cryptoReceived ?? 0) + amount }),
        }
      : {}),
    ...(type === TRADE_TYPES.ADOPT_ME
      ? {
          adpCount: (old?.adpCount ?? 0) + 1,
          ...(isSender
            ? { adpSent: (old?.adpSent ?? 0) + amount }
            : { adpReceived: (old?.adpReceived ?? 0) + amount }),
        }
      : {}),
    ...(type === TRADE_TYPES.HOOD_MODDED
      ? {
          hoodModdedCount: (old?.hoodModdedCount ?? 0) + 1,
          ...(isSender
            ? { hoodModdedSent: (old?.hoodModdedSent ?? 0) + amount }
            : { hoodModdedReceived: (old?.hoodModdedReceived ?? 0) + amount }),
        }
      : {}),
  });
}

async function handleRewards(
  channel: TextBasedChannel,
  person: string,
  type: TRADE_TYPES,
  isCrypto: boolean
) {
  const stats = await container.db.em.findOne(Statistics, person);
  const total =
    // eslint-disable-next-line no-nested-ternary
    type === TRADE_TYPES.LIMITEDS
      ? stats.limitedsSent + stats.limitedsReceived
      : // eslint-disable-next-line no-nested-ternary
      isCrypto
      ? stats.cryptoSent + stats.cryptoReceived
      : // eslint-disable-next-line no-nested-ternary
      TRADE_TYPES.ADOPT_ME
      ? stats.adpSent + stats.adpReceived
      : TRADE_TYPES.HOOD_MODDED
      ? stats.hoodModdedSent + stats.hoodModdedReceived
      : 0;
  if (channel.type === 'GUILD_TEXT') {
    if ((TRADE_TYPES.LIMITEDS === type && total >= 5000000) || (isCrypto && total >= 10000)) {
      await assignMemberRole(person, process.env.TOP_CLIENT_ROLE_ID, channel.guild);
    }
    if ((TRADE_TYPES.LIMITEDS === type && total >= 10000000) || (isCrypto && total >= 20000)) {
      await assignMemberRole(person, process.env.RICH_CLIENT_ROLE_ID, channel.guild);
    }
    if ((TRADE_TYPES.LIMITEDS === type && total >= 25000000) || (isCrypto && total >= 50000)) {
      await assignMemberRole(person, process.env.PREMIER_CLIENT_ROLE_ID, channel.guild);
    }
  }
}

export default async function handleStatistics(
  channel: TextBasedChannel,
  ids: Identities,
  type: TRADE_TYPES,
  amount: number
) {
  const isCrypto = [TRADE_TYPES.ETHEREUM, TRADE_TYPES.BITCOIN, TRADE_TYPES.LITECOIN].includes(type);
  const senderStats = await handleStatisticsUpdate(type, ids.sender, amount, true, isCrypto);
  const receiverStats = await handleStatisticsUpdate(type, ids.receiver, amount, false, isCrypto);
  await container.db.em.persistAndFlush([senderStats, receiverStats]);
  if (type === TRADE_TYPES.LIMITEDS || isCrypto) {
    handleRewards(channel, ids.sender, type, isCrypto);
    handleRewards(channel, ids.receiver, type, isCrypto);
  }
}
