import { container } from '@sapphire/framework';
import {
  Formatters,
  Message,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  TextBasedChannel,
} from 'discord.js';
import interval from 'interval-promise';
import { startCase } from 'lodash';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { GameData } from '@/client';
import {
  COLORS,
  EMOJIS,
  GAME_TRADE_STATUSES,
  GAME_TRADE_TYPES,
  PARTIES,
  RESPONSES,
  TRADE_EVENTS,
  TRADE_TYPES,
} from '@/context';
import GameDeal from '@/entities/GameDeal';
import GameTrade, { AdoptMeItem, HoodModdedItem, TRADE_STATUS } from '@/entities/GameTrade';
import AdoptMeTradePreview from '@/templates/AdoptMeTradePreview';

import handleQuestion from '../core/handleQuestion';
import handleDealTermination from '../shared/handlers/handleDealTermination';

const sendInstructions = async (
  channel: TextBasedChannel,
  ids: Identities,
  serverId: string,
  game: GameData,
  old?: Message
): Promise<Message> => {
  if (old) await old.delete();
  return channel.send({
    content: ids.mention(PARTIES.SENDER),
    embeds: [
      new Embed()
        .setTitle('Request a trade request from the bot')
        .setDescription(
          `Send ${Formatters.inlineCode(
            '$send'
          )} in roblox chat to request a trade request from the bot. Once you have selected all your items confirm the trade then bot will ${Formatters.bold(
            'automatically'
          )} accept it.`
        )
        .setColor(COLORS.WARNING),
    ],
    components: [
      new MessageActionRow().addComponents(
        new MessageButton().setLabel('Rejoin Game').setStyle('LINK').setURL(game.buildVip(serverId))
      ),
    ],
  });
};

export default async function handleGameDealTrade(
  channel: TextBasedChannel,
  ids: Identities,
  type: GAME_TRADE_TYPES,
  serverId: string,
  game: GameData
) {
  let instructions = await sendInstructions(channel, ids, serverId, game, null);
  // @ts-expect-error - This is a valid property.
  process.emit(channel.id, TRADE_EVENTS.ITEMS_SECURED);
  await new Promise(resolve => {
    let stopped = false;
    handleDealTermination(channel, () => {
      stopped = true;
    });
    interval(async (_, stop) => {
      if (stopped) stop();
      const deal = await container.db.em.findOne(GameDeal, channel.id);
      if (deal) {
        if (deal.status === GAME_TRADE_STATUSES.WAITING_FOR_RELEASE) {
          await instructions.delete();
          stop();
          resolve(undefined);
        } else {
          const trades = await deal.trades.init({
            where: { status: TRADE_STATUS.PENDING },
          });
          const trade = trades.getItems()[0];
          if (trade) {
            if (trade.items.length > 0) {
              const image =
                type === TRADE_TYPES.ADOPT_ME
                  ? await AdoptMeTradePreview.newImage(trade.items as unknown as AdoptMeItem[])
                  : Buffer.from('');
              const attachment = new MessageAttachment(image, 'items.png');
              const fields =
                type === TRADE_TYPES.HOOD_MODDED
                  ? trade.items.map((item: HoodModdedItem) => ({
                      name: `${item.name} (${startCase(item.type)}) ${
                        item?.properties?.rotate ? '(Rotates)' : ''
                      }`,
                      value: Formatters.hyperlink(
                        `View ${startCase(item.type)} Color (#${
                          item?.properties?.color ?? 'ffffff'
                        })`,
                        `https://color-hex.com/color/${item?.properties?.color ?? 'ffffff'}`
                      ),
                    }))
                  : [];
              const [confirmation, { allConfirmed }] = await handleQuestion(
                channel,
                {
                  content: ids.mention(PARTIES.RECEIVER),
                  embeds: [
                    new Embed()
                      .setTitle('Are these the correct items?')
                      .setDescription(
                        'Please confirm whether or not these are the items that you are trading for. If they are not select no otherwise select yes to process the trade.'
                      )
                      .addFields(fields)
                      .setImage('attachment://items.png'),
                  ],
                  files: [attachment],
                },
                [ids.receiver],
                RESPONSES.SIMPLE,
                { staffOverridable: true }
              );
              await confirmation.delete();
              if (allConfirmed) {
                const processing = await channel.send({
                  embeds: [
                    new Embed()
                      .setTitle(`${EMOJIS.LOADING} Trade is being processed`)
                      .setDescription(
                        'Please wait while the bot processes the trade and receives the items.'
                      )
                      .addFields(fields)
                      .setColor(COLORS.WARNING)
                      .setImage('attachment://items.png'),
                  ],
                  files: [attachment],
                });
                trade.status = TRADE_STATUS.ACCEPTED;
                await container.db.em.persistAndFlush(trade);
                let declined = false;
                await new Promise(resolve2 => {
                  let stopped2 = false;
                  handleDealTermination(channel, () => {
                    stopped2 = true;
                  });
                  interval(async (_2, stop2) => {
                    if (stopped2) stop();
                    const data = await container.db.em.findOne(GameTrade, trade.id);
                    if (data && data.accepted) {
                      stop2();
                      resolve2(undefined);
                    } else if (data && data.declined) {
                      declined = true;
                      stop2();
                      resolve2(undefined);
                    }
                  }, 5000);
                });
                await processing.delete();
                if (!declined) {
                  await channel.send({
                    embeds: [
                      new Embed()
                        .setTitle('Trade has been processed')
                        .setDescription(
                          'The trade has been processed and the items have been received.'
                        )
                        .addFields(fields)
                        .setColor(COLORS.SUCCESS)
                        .setImage('attachment://items.png'),
                    ],
                    files: [attachment],
                  });
                } else {
                  await channel.send({
                    embeds: [
                      new Embed()
                        .setTitle('Trade Declined')
                        .setDescription('The trade has been declined by the sender')
                        .addFields(fields)
                        .setColor(COLORS.ERROR)
                        .setImage('attachment://items.png'),
                    ],
                    files: [attachment],
                  });
                }
                const [promptMessage, { allConfirmed: additionalTrades }] = await handleQuestion(
                  channel,
                  {
                    content: ids.mention(PARTIES.SENDER),
                    embeds: [
                      new Embed({
                        title: 'Are there more items?',
                        description: `Are there any more items you need to send to the bot?`,
                      }),
                    ],
                  },
                  [ids.sender],
                  RESPONSES.SIMPLE
                );
                if (additionalTrades) {
                  await promptMessage.delete();
                  instructions = await sendInstructions(channel, ids, serverId, game, instructions);
                } else {
                  await promptMessage.delete();
                  // await instructions.delete();
                  deal.status = GAME_TRADE_STATUSES.WAITING_FOR_RELEASE;
                  await container.db.em.persistAndFlush(deal);
                }
              } else {
                trade.status = TRADE_STATUS.DECLINED;
                await container.db.em.persistAndFlush(trade);
                await channel.send({
                  embeds: [
                    new Embed()
                      .setTitle('Trade Declined')
                      .setDescription('The trade has been declined by the buyer')
                      .addFields(fields)
                      .setColor(COLORS.ERROR)
                      .setImage('attachment://items.png'),
                  ],
                  files: [attachment],
                });
                instructions = await sendInstructions(channel, ids, serverId, game, instructions);
              }
            }
          }
        }
      }
    }, 5000);
  });
}
