import { container } from '@sapphire/framework';
import { Promise } from 'bluebird';
import {
  Formatters,
  Message,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  TextBasedChannel,
} from 'discord.js';
import { CryptoDealAmount } from 'index';
import { toLower } from 'lodash';
import path from 'path';
import { toBuffer } from 'qrcode';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import {
  COLORS,
  CRYPTO_CONFIRMATIONS,
  EXPANDED_TRADE_TYPES,
  INTERACTIONS,
  PARTIES,
  TRADE_EVENTS,
  TRADE_TYPES,
} from '@/context';
import Ticket from '@/entities/Ticket';
import UnableToCalculatePrice from '@/errors/UnableToCalculatePrice';
import UnableToGenerateAddress from '@/errors/UnableToGenerateAddress';

import handleInteractions from '../core/handleInteractions';
import handleTransaction from './handleTransaction';
import findAddressUrl from './utils/findAddressUrl';
import findHashUrl from './utils/findHashUrl';
import newBotAddress from './utils/newBotAddress';

type HandleDepositDisplayOptions = 'DEFAULT' | 'FEE' | 'RETRY';

// eslint-disable-next-line consistent-return
async function handleHashConfirmation(
  channel: TextBasedChannel,
  ids: Identities,
  coin: TRADE_TYPES,
  amount: CryptoDealAmount,
  botAddress: string
): Promise<{ botAddress: string; hash: string }> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async resolve => {
    const { tx, amountReceived } = await handleTransaction(
      ids,
      channel,
      coin,
      botAddress,
      amount,
      true
    );
    try {
      await channel.send({
        content: ids.mention(PARTIES.SENDER),
        embeds: [
          new Embed()
            .setTitle('Payment has been received.')
            .setDescription(
              'The payment has been received and reached the required amount of confirmations.'
            )
            .addFields([
              { name: 'Confirmations Reached', value: tx.confirmations.toString(), inline: true },
              { name: 'Amount Received ', value: `${amountReceived} USD`, inline: true },
            ])
            .setColor(COLORS.SUCCESS)
            .setThumbnail('attachment://confirmed.png'),
        ],
        files: [
          new MessageAttachment(
            path.join(__dirname, `../../assets/images/crypto/${toLower(coin)}-confirmed.png`),
            'confirmed.png'
          ),
        ],
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setLabel('View Transaction')
              .setStyle('LINK')
              .setURL(findHashUrl(coin, tx.hash))
          ),
        ],
      });
      resolve({ botAddress, hash: tx.hash });
    } catch (e) {
      container.sentry.handleException(e);
      if (e instanceof UnableToCalculatePrice) {
        await channel.send({
          embeds: [
            new Embed()
              .setTitle('Unable to calculate fee fiat value')
              .setDescription(
                'An error occurred while trying to calculate the fiat value of the fee. Please contact support.'
              )
              .setColor(COLORS.ERROR),
          ],
        });
        throw e;
      }
    }
  });
}

export async function sendDepositInfoEmbed(
  channel: TextBasedChannel,
  ids: Identities,
  coin: TRADE_TYPES,
  amount: CryptoDealAmount,
  botAddress: string,
  displayOption: HandleDepositDisplayOptions = 'DEFAULT'
): Promise<Message> {
  const details = await channel.send({
    content: ids.mention(PARTIES.SENDER),
    embeds: [
      new Embed()
        .setTitle(
          // eslint-disable-next-line no-nested-ternary
          displayOption === 'DEFAULT'
            ? `Send your ${coin} as part of the trade.`
            : displayOption === 'FEE'
            ? `Pay the mm fee with ${coin}`
            : `${
                coin === TRADE_TYPES.ETHEREUM ? 'Replace' : 'Bump'
              } your ${coin} transaction as part of the trade`
        )
        .setDescription(
          `The bot will automatically detect the transaction and wait for ${CRYPTO_CONFIRMATIONS[coin]} confirmation(s).`
        )
        .addFields([
          {
            name: `Address`,
            value: Formatters.hyperlink(botAddress, findAddressUrl(coin, botAddress)),
          },
          { name: `Amount`, value: `${amount.crypto} (${amount.fiat})` },
        ])

        .setColor(COLORS.WARNING)
        .setThumbnail('attachment://pending.png'),
    ],
    files: [
      new MessageAttachment(
        path.join(__dirname, `../../assets/images/crypto/${toLower(coin)}-pending.png`),
        'pending.png'
      ),
    ],
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(INTERACTIONS.CRYPTO_PASTE_ITEMS_BUTTON)
          .setStyle('PRIMARY')
          .setLabel('Paste Details')
          .setEmoji('📋')
      ),
    ],
  });
  handleInteractions(
    details,
    (_, end) => {
      channel.send(amount.crypto);
      channel.send(botAddress);
      end();
    },
    { max: 1, time: 0 }
  );
  return details;
}

export default async function handleDeposit(
  channel: TextBasedChannel,
  ids: Identities,
  coin: TRADE_TYPES,
  amount: CryptoDealAmount
): Promise<{ botAddress: string; hash: string }> {
  const disclaimer = await channel.send({
    content: ids.mention(PARTIES.SENDER),
    embeds: [
      new Embed()
        .setTitle(`Generating a new ${coin} address`)
        .setDescription(
          `Standby while we generate a new ${coin} address for you to send the funds to. This may take a few seconds.`
        )
        .setColor(COLORS.WARNING),
    ],
  });
  return newBotAddress(coin).then(
    // eslint-disable-next-line consistent-return
    async botAddress => {
      const ticket = await container.db.em.findOne(Ticket, channel.id);
      ticket.address = botAddress;
      await container.db.em.persistAndFlush(ticket);
      // @ts-expect-error - This is a valid property.
      process.emit(channel.id, TRADE_EVENTS.ITEMS_SECURED);
      await disclaimer.delete();
      await sendDepositInfoEmbed(channel, ids, coin, amount, botAddress.address);
      return handleHashConfirmation(channel, ids, coin, amount, botAddress.address);
    },
    async e => {
      if (e instanceof UnableToGenerateAddress) {
        await disclaimer.edit({
          embeds: [
            new Embed()
              .setTitle('Failed to generate a new address.')
              .setDescription('An error occurred while generating a new address.')
              .addFields((e.errors ?? []).map((m, i) => ({ name: `Error #${i + 1}`, value: m })))
              .setColor(COLORS.ERROR),
          ],
        });
      }
      throw e;
    }
  );
}
