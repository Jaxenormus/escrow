import { container } from '@sapphire/framework';
import { each, Promise } from 'bluebird';
import dayjs from 'dayjs';
import {
  Formatters,
  Message,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  TextBasedChannel,
} from 'discord.js';
import interval from 'interval-promise';
import { cloneDeep, filter } from 'lodash';
import { TradeAsset, TradeInfo } from 'noblox.js';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import Trade from '@/classes/Trade';
import {
  COLORS,
  EMOJIS,
  INTERACTIONS,
  PARTIES,
  RESPONSES,
  TRADE_EVENTS,
  TRADE_TYPES,
} from '@/context';
import Account from '@/entities/Account';

import handleInteractions from '../core/handleInteractions';
import handleQuestion from '../core/handleQuestion';
import buildTipsAndTricksEmbed from '../shared/buildTipsAndTricksEmbed';
import findRobloxHeadShot from '../shared/findRobloxHeadShot';
import handleTradeTermination from '../shared/handlers/handleDealTermination';
import handlePlayerSelection from '../shared/handlers/handlePlayerSelection';
import handleRobloxRequest, { RobloxWrapper } from './handleRobloxRequest';

export default async function handleTradeSelection(
  channel: TextBasedChannel,
  accountId: string,
  ids: Identities,
  party: PARTIES,
  options?: {
    senderId?: number;
    singleConfirmation?: boolean;
    bypassRapFilter?: boolean;
    handleBackButton?: () => Promise<void>;
  }
): Promise<Trade> {
  let searchingMessage: Message = null;
  let traderId = options?.senderId;
  const account = await container.db.em.findOne(Account, { id: accountId });
  let isSearchCancelled = false;
  const sendSearchingEmbed = async (): Promise<void> => {
    const msg = await channel.send({
      content: ids.mention(party),
      embeds: [
        new Embed()
          .setTitle(`${EMOJIS.LOADING} Searching for all inbound trades`)
          .addFields([
            { name: 'Username', value: account.username },
            { name: 'Trade URL', value: `https://www.roblox.com/users/${accountId}/trade` },
            { name: 'Rolimons URL', value: `https://www.rolimons.com/player/${accountId}` },
          ])
          .setThumbnail(await findRobloxHeadShot(accountId))
          .setColor(COLORS.WARNING),
        buildTipsAndTricksEmbed(TRADE_TYPES.LIMITEDS, party),
      ],
      ...(party === PARTIES.RECEIVER
        ? {
            components: [
              new MessageActionRow().addComponents(
                new MessageButton()
                  .setStyle('PRIMARY')
                  .setCustomId(INTERACTIONS.CHANGE_ACCOUNT_BUTTON)
                  .setLabel('Change Account')
                  .setEmoji('🔁')
              ),
            ],
          }
        : {}),
      ...(party === PARTIES.SENDER && options?.handleBackButton
        ? {
            components: [
              new MessageActionRow().addComponents(
                new MessageButton()
                  .setStyle('PRIMARY')
                  .setCustomId(INTERACTIONS.SEND_TRADE_BACK_BUTTON)
                  .setLabel('Back')
              ),
            ],
          }
        : {}),
    });
    searchingMessage = msg;
    handleInteractions(
      msg,
      async interaction => {
        if (interaction.user.id === ids.get(party)) {
          if (interaction.customId === INTERACTIONS.CHANGE_ACCOUNT_BUTTON) {
            await interaction.deferUpdate();
            const { id: uid } = await handlePlayerSelection(
              TRADE_TYPES.LIMITEDS,
              channel,
              ids,
              party
            );
            traderId = uid;
            await searchingMessage.delete();
            await sendSearchingEmbed();
          } else if (interaction.customId === INTERACTIONS.SEND_TRADE_BACK_BUTTON) {
            await interaction.deferUpdate();
            isSearchCancelled = true;
            await msg.delete();
            await options?.handleBackButton();
          }
        }
      },
      { componentType: 'BUTTON' },
      { avoidUpdate: true }
    );
  };
  await sendSearchingEmbed();
  return new Promise<Trade>((resolve, reject) => {
    const timestamp = Date.now();
    let paused = false;
    let stopped = false;
    handleTradeTermination(channel, e => {
      reject(e);
      paused = true;
      stopped = true;
    });
    const ignored = [];
    interval(async (_, stop) => {
      if (stopped || isSearchCancelled) stop();
      if (!paused && !stopped && !isSearchCancelled) {
        try {
          const tradeInstance = await handleRobloxRequest(account);
          const tradesReq = await tradeInstance.get<RobloxWrapper<TradeAsset[]>>(
            'https://trades.roblox.com/v1/trades/Inbound',
            { params: { sortOrder: 'Asc', limit: 100 } }
          );
          const trades = filter(
            tradesReq.data.data,
            x =>
              dayjs(x.created).isAfter(timestamp) &&
              !ignored.includes(x.id) &&
              (traderId ? x.user.id === traderId : true)
          );
          await each(trades, async ({ id }) => {
            const tradeReq = await tradeInstance.get<TradeInfo>(
              `https://trades.roblox.com/v1/trades/${id}`
            );
            const trade = new Trade(tradeReq.data, party, traderId);
            await trade.init();
            paused = true;
            const image = await trade.genImage();
            const attachment = new MessageAttachment(image, 'trade.png');
            const baseEmbed = new Embed().setImage('attachment://trade.png');
            const [confirm, { allConfirmed }] = await handleQuestion(
              channel,
              {
                embeds: [
                  cloneDeep(baseEmbed)
                    .setTitle('Is this the correct trade?')
                    .setDescription(`Sender: ${Formatters.inlineCode(trade.trader.name)}`)
                    .setFooter({
                      text: options?.singleConfirmation
                        ? ''
                        : "We will only proceed once both users press 'Yes'",
                    })
                    .setColor(COLORS.WARNING),
                ],
                files: [attachment],
              },
              options?.singleConfirmation ? [ids.get(party)] : ids.both,
              RESPONSES.SIMPLE,
              { acknowledgeResponse: true }
            );
            const isValid = trade.isValid();
            if (
              allConfirmed &&
              (isValid === 'VALID' || (isValid === 'HIGH_RAP' && options?.bypassRapFilter))
            ) {
              await confirm.delete();
              const processing = await channel.send({
                embeds: [
                  cloneDeep(baseEmbed)
                    .setTitle(`${EMOJIS.LOADING} Processing Trade...`)
                    .setDescription('This may take a few minutes to process due to 2FA.')
                    .setColor(COLORS.WARNING),
                ],
                files: [attachment],
              });
              // @ts-expect-error - This is a valid property.
              process.emit(channel.id, TRADE_EVENTS.ITEMS_SECURED);
              const timer = dayjs().toDate();
              const status = await trade.accept(accountId);
              paused = true;
              if (searchingMessage) await searchingMessage.delete();
              await processing.delete();
              if (!['INVENTORY_NOT_CHANGED', 'SUCCESS'].includes(status)) {
                await channel.send({
                  embeds: [
                    new Embed()
                      .setTitle('Unable to secure items.')
                      .setDescription(
                        // eslint-disable-next-line no-nested-ternary
                        status === 'INVENTORY_CHANGED'
                          ? "The sender's inventory has changed and the items are not available. Resend the trade."
                          : // eslint-disable-next-line no-nested-ternary
                          status === 'TWO_FACTOR'
                          ? 'The bot was unable to automatically reset the 2FA on the account. Contact a middleman for assistance.'
                          : status === 'REQUEST_TOOK_TO_LONG'
                          ? `The bot was unable to secure the items in time. Ping a staff member ${Formatters.time(
                              dayjs().add(10, 'minute').toDate(),
                              'R'
                            )} to resolve the issue.`
                          : `Resend the trade\n${Formatters.codeBlock(status)}`
                      )
                      .setImage('attachment://trade.png')
                      .setColor(COLORS.ERROR),
                  ],
                  files: [attachment],
                });
                await sendSearchingEmbed();
                paused = false;
              } else {
                stop();
                const embed = cloneDeep(baseEmbed);
                if (status === 'INVENTORY_NOT_CHANGED') {
                  embed.setDescription(
                    `The bots inventory has not changed since ${Formatters.time(
                      timer,
                      'R'
                    )} this could be due to the items not releasing, contact a middleman if this is the case`
                  );
                }
                await channel.send({
                  embeds: [
                    embed
                      .setTitle('Trade Accepted')
                      .setImage('attachment://trade.png')
                      .setColor(
                        status === 'INVENTORY_NOT_CHANGED' ? COLORS.WARNING : COLORS.SUCCESS
                      ),
                  ],
                  files: [attachment],
                });
                resolve(trade);
              }
            } else {
              if (isValid !== 'VALID' && allConfirmed) {
                const embed = new Embed()
                  .setTitle('Unable to process trade')
                  .setColor(COLORS.ERROR);
                // eslint-disable-next-line default-case
                switch (isValid) {
                  case 'HIGH_RAP': {
                    embed.setDescription(
                      `Trade contains items with a total of ${Formatters.inlineCode(
                        trade.sending.rap.toString()
                      )} RAP. Resend trade with less than ${Formatters.inlineCode('2000')} RAP.`
                    );
                    break;
                  }
                  case 'SMALLS_LEACHER': {
                    embed.setDescription(
                      `You cannot take ${Formatters.inlineCode(
                        trade.sending.items.length.toString()
                      )} smalls from the bot. Resend the trade with ${Formatters.inlineCode(
                        '1'
                      )} small.`
                    );
                    break;
                  }
                  case 'WRONG_SENDER': {
                    embed.setDescription(
                      `Trade was sent from ${Formatters.inlineCode(
                        trade.trader.id.toString()
                      )} instead of ${Formatters.inlineCode(
                        options?.senderId.toString()
                      )}. Resend the trade.`
                    );
                    break;
                  }
                  case 'ROBUX_LEACHER': {
                    embed.setDescription(
                      `You cannot take ${Formatters.inlineCode(
                        trade.sending.robux.toString()
                      )} Robux from the bot. Resend the trade with ${Formatters.inlineCode(
                        '0'
                      )} Robux.`
                    );
                  }
                }
                await channel.send({ embeds: [embed] });
              }
              try {
                const declineInstance = await handleRobloxRequest(account, true);
                await declineInstance.post(`https://trades.roblox.com/v1/trades/${id}/decline`);
              } catch (e) {
                container.sentry.handleException(e);
                await channel.send({
                  embeds: [
                    new Embed()
                      .setTitle('Failed to decline trade')
                      .setDescription(Formatters.codeBlock(e.message))
                      .setColor(COLORS.ERROR),
                  ],
                });
              }
              ignored.push(tradeReq.data.id);
              await confirm.delete();
              if (searchingMessage) await searchingMessage.delete();
              await sendSearchingEmbed();
              paused = false;
            }
          });
        } catch (e) {
          container.sentry.handleException(e);
        }
      }
    }, 10000);
  });
}
