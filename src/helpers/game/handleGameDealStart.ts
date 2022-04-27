import { container } from '@sapphire/framework';
import { Promise } from 'bluebird';
import { Formatters, MessageActionRow, MessageButton, TextBasedChannel } from 'discord.js';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { GameData } from '@/client';
import { COLORS, GAME_TRADE_STATUSES, GAME_TRADE_TYPES, INTERACTIONS, PARTIES } from '@/context';
import Account from '@/entities/Account';
import GameDeal from '@/entities/GameDeal';
import Ticket from '@/entities/Ticket';

import handleInteractions from '../core/handleInteractions';
import buildTipsAndTricksEmbed from '../shared/buildTipsAndTricksEmbed';
import handleAccountSelection from '../shared/handlers/handleAccountSelection';
import handleIdentification from '../shared/handlers/handleIdentification';
import handlePlayerSelection from '../shared/handlers/handlePlayerSelection';
// import handleFeeCollection from '../fee/handleFeeCollection';
import waitForGameTradeStatus from './utils/waitForGameTradeStatus';

async function handleGameJoin(
  channel: TextBasedChannel,
  ids: Identities,
  type: GAME_TRADE_TYPES,
  sender: string,
  game: GameData,
  serverId: string
) {
  // eslint-disable-next-line no-async-promise-executor
  await new Promise(async resolve => {
    const joinMsg = await channel.send({
      content: ids.mention(PARTIES.SENDER),
      embeds: [
        new Embed()
          .setTitle('Join private server to send your items')
          .setDescription(
            `Once the ${Formatters.inlineCode(
              sender
            )} account has been detected the bot will proceed with the trade. If you want to join with a different account click the button below.`
          )
          .setThumbnail(game.thumbnail)
          .setColor(COLORS.WARNING),
        buildTipsAndTricksEmbed(type, PARTIES.SENDER),
      ],
      components: [
        new MessageActionRow().addComponents(
          new MessageButton().setStyle('LINK').setLabel('Join VIP').setURL(game.buildVip(serverId)),
          new MessageButton()
            .setStyle('PRIMARY')
            .setLabel('Change Account')
            .setCustomId(INTERACTIONS.CHANGE_ACCOUNT_BUTTON)
        ),
      ],
    });
    handleInteractions(joinMsg, async interaction => {
      if (
        interaction.customId === INTERACTIONS.CHANGE_ACCOUNT_BUTTON &&
        interaction.user.id === ids.sender
      ) {
        await joinMsg.delete();
        const { name } = await handlePlayerSelection(type, channel, ids, PARTIES.SENDER, {
          cleanUp: true,
        });
        resolve(handleGameJoin(channel, ids, type, name, game, serverId));
      }
    });
    await waitForGameTradeStatus(channel, GAME_TRADE_STATUSES.READY_TO_TRADE);
    await joinMsg.delete();
    resolve();
  });
}

export default async function handleGameDealStart(
  channel: TextBasedChannel,
  type: GAME_TRADE_TYPES
): Promise<{ ids: Identities; account: Account; game: GameData }> {
  const ids = await handleIdentification(channel, type);
  // await handleFeeCollection(channel, ids);
  const accountId = await handleAccountSelection(channel, ids, type);
  const account = await container.db.em.findOne(Account, { id: accountId });
  await account.server.init();
  const ticket = await container.db.em.upsert(Ticket, { id: channel.id, server: account.server });
  await container.db.em.persistAndFlush(ticket);
  const sender = await handlePlayerSelection(type, channel, ids, PARTIES.SENDER, { cleanUp: true });
  const newDeal = container.db.em.create(GameDeal, {
    id: channel.id,
    seller: sender.id.toString(),
    buyer: '',
    status: GAME_TRADE_STATUSES.WAITING_FOR_SENDER,
    ticket: { id: channel.id },
  });
  await container.db.em.persistAndFlush(newDeal);
  const game = container.data.games[type];
  await handleGameJoin(channel, ids, type, sender.name, game, account.server.id);
  return { ids, account, game };
}
