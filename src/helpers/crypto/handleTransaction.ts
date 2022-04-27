import { container } from '@sapphire/framework';
import dayjs from 'dayjs';
import {
  Formatters,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  TextBasedChannel,
} from 'discord.js';
import { CryptoDealAmount } from 'index';
import interval from 'interval-promise';
import { toLower, toString } from 'lodash';
import path from 'path';
import sb from 'satoshi-bitcoin';
import web3 from 'web3';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, CRYPTO_CONFIRMATIONS, TRADE_TYPES } from '@/context';

import handleInteractions from '../core/handleInteractions';
import handleQuestion from '../core/handleQuestion';
import formatFiatValue from '../shared/formatFiatValue';
import handleDealTermination from '../shared/handlers/handleDealTermination';
import { sendDepositInfoEmbed } from './handleDeposit';
import findFiatAmount from './utils/findFiatAmount';
import findHashUrl from './utils/findHashUrl';
import validateHash, { ReturnType, Tx } from './utils/validateHash';
import waitForConfirmation from './utils/waitForConfirmation';

export default async function handleTransaction(
  ids: Identities,
  channel: TextBasedChannel,
  coin: TRADE_TYPES,
  address: string,
  amount: CryptoDealAmount,
  needsConfirmation: boolean = true,
  ignoredHashes: string[] = []
): Promise<{ tx: Tx; amountReceived: string; status: ReturnType }> {
  return new Promise(resolve => {
    let stopped = false;
    const ignore = [...ignoredHashes];
    // eslint-disable-next-line consistent-return
    interval(async (_, stop) => {
      // eslint-disable-next-line no-return-assign
      handleDealTermination(channel, () => (stopped = true));
      if (stopped) stop();
      const rawData = await container
        .blockcypher(coin)
        .get<{ txs: Tx[] }>(`/addrs/${address}/full`, { params: { limit: 50 } });
      const tx = rawData.data.txs
        .sort((a, b) => dayjs(b.received).millisecond() - dayjs(a.received).millisecond())
        .find(t =>
          t.addresses.includes(coin === TRADE_TYPES.ETHEREUM ? address.slice(2) : address)
        );
      if (tx && !ignore.includes(tx.hash)) {
        const { status, output } = await validateHash(coin, address, amount, tx.hash);
        const rawAmountReceived =
          coin === TRADE_TYPES.ETHEREUM
            ? web3.utils.fromWei(output.value.toString())
            : sb.toBitcoin(output.value);
        const amountReceived = formatFiatValue(await findFiatAmount(coin, rawAmountReceived));
        if (status === 'VALID') {
          stop();
          const msg = await channel.send({
            embeds: [
              new Embed()
                .setTitle('Valid transaction has been detected.')
                .setDescription(
                  `If you have bumped or replaced the transaction, click the button below. Note that the bot will ignore the current hash`
                )
                .addFields([
                  {
                    name: 'Hash',
                    value: Formatters.hyperlink(tx.hash, findHashUrl(coin, tx.hash)),
                  },
                  {
                    name: 'Required Confirmations',
                    value: toString(CRYPTO_CONFIRMATIONS[coin]),
                    inline: true,
                  },
                  {
                    name: 'Amount Received ',
                    value: `${amountReceived} USD`,
                    inline: true,
                  },
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
                  .setLabel(`Change Hash`)
                  .setStyle('SECONDARY')
                  .setCustomId('change')
              ),
            ],
          });
          if (!needsConfirmation) {
            await msg.delete();
            return resolve({ tx, status, amountReceived });
          }
          handleInteractions(msg, async interaction => {
            if (interaction.user.id === ids.sender) {
              const [message, { allConfirmed }] = await handleQuestion(
                interaction.channel,
                {
                  embeds: [
                    new Embed()
                      .setTitle('Are you sure you want to change the hash?')
                      .setDescription(
                        'You should only be doing this if you have bumped or replaced the transaction. This will ignore the current hash and wait for a new one.'
                      )
                      .setColor(COLORS.WARNING),
                  ],
                },
                [interaction.user.id],
                { CONFIRM: 'Change Hash', DENY: 'Go Back' },
                { staffOverridable: true, dangerousActions: true }
              );
              if (allConfirmed) {
                await message.delete();
                await msg.delete();
                await sendDepositInfoEmbed(
                  interaction.channel,
                  ids,
                  coin,
                  amount,
                  address,
                  'RETRY'
                );
                resolve(
                  handleTransaction(ids, channel, coin, address, amount, true, [...ignore, tx.hash])
                );
              } else {
                await message.delete();
              }
            }
          });
          const newTx = await waitForConfirmation(coin, tx.hash, CRYPTO_CONFIRMATIONS[coin]);
          await msg.delete();
          resolve({ tx: newTx, status, amountReceived });
        } else if (status === 'UNDERPAID') {
          ignore.push(tx.hash);
          await channel.send({
            embeds: [
              new Embed()
                .setTitle('Invalid transaction has been detected.')
                .setDescription(
                  `This transaction has been detected but is less than 98% of the amount required.`
                )
                .addFields([
                  {
                    name: 'Hash',
                    value: Formatters.hyperlink(tx.hash, findHashUrl(coin, tx.hash)),
                  },
                ])
                .setColor(COLORS.ERROR),
            ],
          });
        } else {
          resolve(handleTransaction(ids, channel, coin, address, amount));
        }
      }
    }, 30000);
  });
}
