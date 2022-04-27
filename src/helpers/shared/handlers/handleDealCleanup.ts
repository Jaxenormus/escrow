import { Promise } from 'bluebird';
import { Formatters, Guild, TextBasedChannel } from 'discord.js';
import cron from 'node-cron';

import Identities from '@/classes/Identities';
import { TRADE_TYPES } from '@/context';

import assignMemberRole from '../assignMemberRole';
import handleStatistics from './handleStatistics';

async function attemptToDm(guild: Guild, memberId: string): Promise<void> {
  try {
    const member = await guild.members.fetch(memberId);
    await member.send(
      `Hey ${Formatters.userMention(
        member.id
      )}, we noticed you completed a deal with **Escrow Automation**, and didn't leave a vouch. If you're satisfied with our **free** service, consider leaving one as it helps us grow! ${Formatters.channelMention(
        process.env.VOUCH_CHANNEL_ID
      )}`
    );
  } catch (e) {
    /* quietly handle missing permissions to dm user */
  }
}

export async function handleTicketStatistics(
  channel: TextBasedChannel,
  ids: Identities,
  type: TRADE_TYPES,
  amount: number
) {
  if (channel.type === 'GUILD_TEXT') {
    await handleStatistics(channel, ids, type, amount);
    await assignMemberRole(ids.sender, process.env.CLIENT_ROLE_ID, channel.guild);
    await assignMemberRole(ids.receiver, process.env.CLIENT_ROLE_ID, channel.guild);
  }
}
/**
 * Handles the completion of a deal.
 * @param channel The channel of the deal.
 * @param ids The identities of the deal.
 * @param type The type of the deal.
 * @param amount The amount of the deal.
 * @param premium If the deal is using a premium account.
 * @param resource The temp address or account of the deal.
 * @param ignoreStatistics If the tracking of statistics should be ignored.
 */
export default async function handleDealCleanup(
  channel: TextBasedChannel,
  ids: Identities,
  type: TRADE_TYPES,
  amount: number,
  ignoreStatistics?: boolean
): Promise<void> {
  if (channel.type === 'GUILD_TEXT') {
    if (!ignoreStatistics) await handleTicketStatistics(channel, ids, type, amount);
    await Promise.delay(10000);
    await channel.send('$delete');
    const schedule = cron.schedule('*/5 * * * *', async () => {
      const vouchChannel = channel.guild.channels.cache.get(process.env.VOUCH_CHANNEL_ID);
      if (vouchChannel.type === 'GUILD_TEXT') {
        const messages = await vouchChannel.messages.fetch();
        const vouches = messages.filter(
          vouch =>
            ids.both.includes(vouch.author.id) && vouch.createdTimestamp > channel.createdTimestamp
        );
        if (vouches.size === 0) {
          await Promise.all([
            attemptToDm(channel.guild, ids.sender),
            attemptToDm(channel.guild, ids.receiver),
          ]);
        }
      }
      schedule.stop();
    });
  }
}
