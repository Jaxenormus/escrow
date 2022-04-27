import { wrap } from '@mikro-orm/core';
import { container } from '@sapphire/framework';
import { Promise } from 'bluebird';
import { Formatters, Message, MessageActionRow, MessageButton, TextBasedChannel } from 'discord.js';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, GAME_TRADE_STATUSES, GAME_TRADE_TYPES, PARTIES } from '@/context';
import GameDeal from '@/entities/GameDeal';

import handleInteractions from '../core/handleInteractions';
import buildTipsAndTricksEmbed from '../shared/buildTipsAndTricksEmbed';
import handlePlayerSelection from '../shared/handlers/handlePlayerSelection';
import waitForGameTradeStatus from './utils/waitForGameTradeStatus';

async function sendReleaseMessage(
  channel: TextBasedChannel,
  ids: Identities,
  type: GAME_TRADE_TYPES,
  party: PARTIES,
  name: string,
  serverId: string
): Promise<Message> {
  const game = container.data.games[type];
  return channel.send({
    content: ids.mention(party),
    embeds: [
      new Embed()
        .setTitle('Join private server to retrieve your items')
        .setDescription(
          `Once you have joined with the ${Formatters.inlineCode(
            name
          )} account type ${Formatters.inlineCode(
            '$release'
          )} in chat to get your items. If you want to join with a different account click the button below.`
        )
        .setThumbnail(game.thumbnail)
        .setColor(COLORS.WARNING),
      buildTipsAndTricksEmbed(type, party),
    ],
    components: [
      new MessageActionRow().addComponents(
        new MessageButton().setStyle('LINK').setLabel('Join VIP').setURL(game.buildVip(serverId)),
        new MessageButton().setStyle('PRIMARY').setLabel('Change Account').setCustomId('change')
      ),
    ],
  });
}
export default async function handleGameDealRelease(
  channel: TextBasedChannel,
  ids: Identities,
  type: GAME_TRADE_TYPES,
  party: PARTIES,
  isReturn: boolean = false
) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async resolve => {
    const { id, name } = await handlePlayerSelection(type, channel, ids, party, {
      cleanUp: true,
    });
    const deal = await container.db.em.findOne(GameDeal, channel.id);
    await deal.ticket.init();
    await deal.ticket.server.init();
    wrap(deal).assign({ buyer: id.toString(), status: GAME_TRADE_STATUSES.DEAL_RELEASED });
    await container.db.em.persistAndFlush(deal);
    const releaseMsg = await sendReleaseMessage(
      channel,
      ids,
      type,
      party,
      name,
      deal.ticket.server.id
    );
    handleInteractions(releaseMsg, async interaction => {
      if (interaction.customId === 'change') {
        await releaseMsg.delete();
        resolve(handleGameDealRelease(channel, ids, type, party, isReturn));
      }
    });
    await waitForGameTradeStatus(channel, GAME_TRADE_STATUSES.DEAL_REDEEMED);
    await releaseMsg.delete();
    await channel.send({
      embeds: [
        new Embed()
          .setTitle('Trade has been redeemed')
          .setDescription(
            `The trade has been redeemed and the pets have been ${
              isReturn ? 'returned' : 'given'
            } to ${Formatters.inlineCode(
              name
            )}. Please leave a vouch in ${Formatters.channelMention(
              process.env.VOUCH_CHANNEL_ID
            )} if you enjoyed our service.`
          )
          .setColor(COLORS.SUCCESS),
      ],
    });
    resolve();
  });
}
