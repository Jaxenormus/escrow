import { container } from '@sapphire/framework';
import { MessageActionRow, MessageButton, MessageSelectMenu, TextBasedChannel } from 'discord.js';
import { ceil, sumBy, toLower } from 'lodash';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import Trade from '@/classes/Trade';
import {
  COLORS,
  CRYPTO_TRADE_TYPES,
  EXPANDED_TRADE_TYPES,
  GAME_TRADE_TYPES,
  INTERACTIONS,
  PARTIES,
  TRADE_TYPES,
} from '@/context';
import Ticket from '@/entities/Ticket';
import AdminOnlyPrecondition from '@/preconditions/roles/adminOnly';

import handleInteractions from '../../core/handleInteractions';
import handleMenuSelection from '../../core/handleMenuSelection';
import handleAddyCollection from '../../crypto/handleAddyCollection';
import handleRelease from '../../crypto/handleRelease';
import handleGameDealRelease from '../../game/handleGameDealRelease';
import handleTradeSelection from '../../limiteds/handleTradeSelection';
import handleDealCleanup from './handleDealCleanup';
import handlePlayerSelection from './handlePlayerSelection';

type HandleTradeCancelationOptions = {
  type: TRADE_TYPES;
  channel: TextBasedChannel;
  ids: Identities;
  staffConfNeeded?: boolean;
  account?: string;
  trades?: Trade[];
} & (
  | {
      type: TRADE_TYPES.LIMITEDS;
      account: string;
      trades: Trade[];
    }
  | {
      type: CRYPTO_TRADE_TYPES;
    }
  | {
      type: GAME_TRADE_TYPES;
      account: string;
    }
  | {
      type: Exclude<
        TRADE_TYPES,
        | TRADE_TYPES.LIMITEDS
        | TRADE_TYPES.ETHEREUM
        | TRADE_TYPES.BITCOIN
        | TRADE_TYPES.LITECOIN
        | TRADE_TYPES.ADOPT_ME
      >;
    }
);

/**
 * This function handles the cancelation of a trade.
 * @param type The type of trade.
 * @param client The Akairo client.
 * @param channel The channel where the trade is taking place.
 * @param ids The identities of the trade.
 * @param account The account of the trade.
 * @param coin The coin of the trade.
 * @param tempAddress The temporary address of the trade.
 * @param numOfTrades The number of trades.
 * @returns A promise that resolves to a void.
 */
export default async function handleDealCancelation({
  channel,
  ids,
  account,
  type,
  trades,
  staffConfNeeded = true,
}: HandleTradeCancelationOptions): Promise<void> {
  const beingReturned = toLower(EXPANDED_TRADE_TYPES[type]);
  const message = await channel.send({
    embeds: [
      new Embed({
        title: 'Deal Cancelled',
        description: `The deal has been cancelled. ${
          staffConfNeeded
            ? `Contact a staff member to resolve the issue and return the ${beingReturned}.`
            : `Click the return button to get your ${beingReturned}`
        }`,
        color: COLORS.ERROR,
      }),
    ],
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(INTERACTIONS.DEAL_CANCEL_RETURN_BUTTON)
          .setStyle('PRIMARY')
          .setLabel('Return')
      ),
    ],
  });
  const returningTo = await handleInteractions<PARTIES>(
    message,
    async (_, end) => {
      if (!staffConfNeeded) return end(PARTIES.SENDER);
      const sender = await message.guild.members.fetch(ids.sender);
      const receiver = await message.guild.members.fetch(ids.receiver);
      const msg = await channel.send({
        embeds: [
          new Embed()
            .setTitle('Who do you want to return it to?')
            .setDescription('Select the user that is receiving the return.'),
        ],
        components: [
          new MessageActionRow().addComponents(
            new MessageSelectMenu()
              .setCustomId(INTERACTIONS.TRADE_CANCELATION_RETURN_TO_MENU)
              .addOptions([
                {
                  label: `${sender.user.username}#${sender.user.discriminator}`,
                  value: PARTIES.SENDER,
                },
                {
                  label: `${receiver.user.username}#${receiver.user.discriminator}`,
                  value: PARTIES.RECEIVER,
                },
              ])
          ),
        ],
      });
      const selection = await handleMenuSelection<PARTIES>(msg, {
        filter: async i2 => AdminOnlyPrecondition.isAdmin(i2.user.id),
        max: 1,
      });
      return end(selection.value);
    },
    {
      filter: async i =>
        i.customId === INTERACTIONS.DEAL_CANCEL_RETURN_BUTTON && staffConfNeeded
          ? AdminOnlyPrecondition.isAdmin(i.user.id)
          : true,
      max: 1,
    }
  );
  // eslint-disable-next-line default-case
  switch (type) {
    case TRADE_TYPES.LIMITEDS: {
      const { id: uid } = await handlePlayerSelection(type, channel, ids, returningTo);
      // eslint-disable-next-line no-restricted-syntax
      for (const id in Array(ceil(sumBy(trades, t => t.receiving.items.length) / 4)).fill(0)) {
        if (id) {
          // eslint-disable-next-line no-await-in-loop
          await handleTradeSelection(channel, account, ids, returningTo, {
            singleConfirmation: true,
            bypassRapFilter: true,
            senderId: uid,
          });
        }
      }
      await handleDealCleanup(channel, ids, type, 0, true);
      break;
    }
    case TRADE_TYPES.ETHEREUM:
    case TRADE_TYPES.BITCOIN:
    case TRADE_TYPES.LITECOIN: {
      const ticket = await container.db.em.findOne(Ticket, channel.id);
      await ticket.address?.init();
      const destination = await handleAddyCollection(channel, ids, type, returningTo);
      await handleRelease(type, channel, destination, ticket.address.address, ids, returningTo, {
        isRefund: true,
      });
      await handleDealCleanup(channel, ids, type, 0, true);
      break;
    }
    case TRADE_TYPES.ADOPT_ME:
    case TRADE_TYPES.HOOD_MODDED: {
      await handleGameDealRelease(channel, ids, type, returningTo, true);
      await handleDealCleanup(channel, ids, type, 0, true);
      break;
    }
  }
}
