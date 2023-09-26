// /* eslint-disable no-case-declarations */

// import type {
//   Message,
//   TextBasedChannel} from 'discord.js';
// import {
//   Formatters,
//   MessageActionRow,
//   MessageButton,
//   MessageSelectMenu
// } from 'discord.js';
// import type { CryptoDealAmount } from 'index';
// import puppeteer from 'puppeteer';

// import Embed from '@/src/classes/Embed';
// import type Identities from '@/src/classes/Identities';
// import type {
//   TRADE_TYPES} from '@/src/context';
// import {
//   COLORS,
//   EMOJIS,
//   INTERACTIONS,
//   PAYMENT_METHODS,
//   REPLY_DELETE_TIMEOUT
// } from '@/src/context';
// import { sendDepositInfoEmbed } from '@/src/old/helpers/crypto/handleDeposit';

// import handleMenuSelection from '../../helpers/listenForMenuSelection';
// import handleMessage from '../v2/helpers/core/listenForMessages';
// import handleTransaction from '../helpers/crypto/handleTransaction';
// import findCoinAmount from '../helpers/crypto/utils/findCoinAmount';
// import findHashUrl from '../../helpers/crypto/findHashUrl';
// import formatFiatValue from '../../helpers/fiatFormat';

// const FEE_AMOUNT_IN_USD = 2;
// const CASH_APP_TAG = '$ellismartinez1';
// const ETHEREUM_ADDRESS = '';
// const BITCOIN_ADDRESS = '';
// const LITECOIN_ADDRESS = '';

// export default async function handleFeeCollection(channel: TextBasedChannel, ids: Identities) {
//   const message = await channel.send({
//     content: ids.mention(),
//     embeds: [
//       new Embed()
//         .setTitle('Select how you would like to pay the mm fee')
//         .setDescription('Choose a payment method from the following options below'),
//     ],
//     components: [
//       new MessageActionRow().addComponents(
//         new MessageSelectMenu()
//           .setCustomId(INTERACTIONS.FEE_PAYMENT_METHOD_SELECTION_MENU)
//           .setPlaceholder('Select a payment method')
//           .addOptions([
//             { label: 'BTC', value: PAYMENT_METHODS.BITCOIN, emoji: EMOJIS.BITCOIN },
//             { label: 'ETH', value: PAYMENT_METHODS.ETHEREUM, emoji: EMOJIS.ETHEREUM },
//             { label: 'LTC', value: PAYMENT_METHODS.LITECOIN, emoji: EMOJIS.LITECOIN },
//             { label: 'Cash App', value: PAYMENT_METHODS.CASHAPP, emoji: EMOJIS.CASHAPP },
//           ])
//       ),
//     ],
//   });
//   const selection = await handleMenuSelection<PAYMENT_METHODS>(message, { max: 1 });
//   // eslint-disable-next-line default-case
//   switch (selection.value) {
//     case PAYMENT_METHODS.ETHEREUM:
//     case PAYMENT_METHODS.BITCOIN:
//     case PAYMENT_METHODS.LITECOIN:
//       await message.delete();
//       const coin = selection.value as unknown as TRADE_TYPES;
//       const address =
//         // eslint-disable-next-line no-nested-ternary
//         selection.value === PAYMENT_METHODS.ETHEREUM
//           ? ETHEREUM_ADDRESS
//           : selection.value === PAYMENT_METHODS.BITCOIN
//           ? BITCOIN_ADDRESS
//           : LITECOIN_ADDRESS;
//       const coinAmount = await findCoinAmount(coin, FEE_AMOUNT_IN_USD);
//       const feeAmount: CryptoDealAmount = {
//         crypto: coinAmount.toFixed(8),
//         fiat: formatFiatValue(FEE_AMOUNT_IN_USD),
//         raw_crypto: coinAmount,
//         raw_fiat: FEE_AMOUNT_IN_USD,
//       };
//       await sendDepositInfoEmbed(channel, ids, coin, feeAmount, address, 'FEE');
//       const { tx } = await handleTransaction(ids, channel, coin, address, feeAmount, false);
//       await channel.send({
//         content: ids.mention(),
//         embeds: [
//           new Embed()
//             .setTitle('Payment has been verified and received')
//             .setDescription('The mm fee has been paid and the transaction has been completed')
//             .setColor(COLORS.SUCCESS),
//         ],
//         components: [
//           new MessageActionRow().addComponents(
//             new MessageButton()
//               .setStyle('LINK')
//               .setLabel('View transaction')
//               .setURL(findHashUrl(coin, tx.hash))
//           ),
//         ],
//       });
//       break;
//     case PAYMENT_METHODS.CASHAPP:
//       await message.delete();
//       const handleCashAppPayment = async (
//         requiredAmount: number,
//         invalidLinks: string[] = []
//       ): Promise<Message> => {
//         const information = await channel.send({
//           content: Formatters.userMention(selection.user.id),
//           embeds: [
//             new Embed()
//               .setTitle('Pay the mm fee via cash app')
//               .setDescription(
//                 'Click the button below to pay the mm fee via cash app. Once you have paid the fee, send the receipt link here'
//               )
//               .addFields([
//                 { name: 'USD Amount', value: formatFiatValue(requiredAmount), inline: true },
//                 { name: 'Cash Tag', value: CASH_APP_TAG, inline: true },
//               ])
//               .setThumbnail(`https://cash.app/qr/${CASH_APP_TAG}?size=288&margin=25`)
//               .setColor(COLORS.WARNING),
//           ],
//           components: [
//             new MessageActionRow().addComponents(
//               new MessageButton()
//                 .setStyle('LINK')
//                 .setLabel('Pay via cash app')
//                 .setURL(`https://cash.app/${CASH_APP_TAG}`)
//             ),
//           ],
//         });
//         const webReceipt = await handleMessage(channel, async (msg, end) => {
//           if (msg.author.id === selection.user.id) {
//             const regex = /^https:\/\/cash\.app\/payments\/[a-z0-9]+\/receipt$/;
//             if (invalidLinks.includes(msg.content)) {
//               const temp = await msg.reply('Cannot use the same receipt link twice');
//               setTimeout(() => temp.delete(), REPLY_DELETE_TIMEOUT);
//             } else if (regex.test(msg.content)) {
//               end();
//             } else {
//               const temp = await msg.reply('This is not a valid cash app receipt link');
//               setTimeout(() => temp.delete(), REPLY_DELETE_TIMEOUT);
//             }
//           }
//         });
//         await information.delete();
//         await webReceipt.delete();
//         const loadingMessage = await channel.send({
//           embeds: [
//             new Embed()
//               .setTitle('Reviewing and verifying payment receipt')
//               .setDescription(
//                 'Please wait while we verify your payment receipt link this should only take a few seconds.'
//               )
//               .setColor(COLORS.WARNING),
//           ],
//           components: [
//             new MessageActionRow().addComponents(
//               new MessageButton()
//                 .setStyle('LINK')
//                 .setLabel('View receipt')
//                 .setURL(webReceipt.content)
//             ),
//           ],
//         });
//         try {
//           const browser = await puppeteer.launch({
//             headless: true,
//             args: ['--no-sandbox', '--disable-setuid-sandbox'],
//           });
//           const page = await browser.newPage();
//           await page.goto(webReceipt.content);
//           await page.waitForSelector('dl:first-child > dd');
//           const rawAmount = await page.$eval('dl:first-child > dd', e => e.innerText);
//           const amount = parseFloat(rawAmount.replace('$', '').replace(',', ''));
//           const rawReceiver = await page.$eval('h4', e => e.innerText);
//           const receiver = rawReceiver.split(' ')[2];
//           await browser.close();
//           if (receiver !== CASH_APP_TAG) {
//             await loadingMessage.delete();
//             await channel.send({
//               embeds: [
//                 new Embed()
//                   .setTitle('Invalid payment receiver')
//                   .setDescription(
//                     'The payment receiver is incorrect and cannot be processed. Please send the payment to the correct receiver'
//                   )
//                   .setColor(COLORS.ERROR),
//               ],
//             });
//             return await handleCashAppPayment(requiredAmount);
//           }
//           if (amount < requiredAmount) {
//             const remaining = requiredAmount - amount;
//             await loadingMessage.delete();
//             await channel.send({
//               embeds: [
//                 new Embed()
//                   .setTitle('Invalid payment amount')
//                   .setDescription(
//                     `The amount you have sent is incorrect and cannot be processed. Please send the remaining amount to complete the payment.`
//                   )
//                   .addFields([
//                     { name: 'Expected', value: formatFiatValue(requiredAmount), inline: true },
//                     { name: 'Received', value: formatFiatValue(amount), inline: true },
//                     { name: 'Remaining', value: formatFiatValue(remaining), inline: true },
//                   ])
//                   .setColor(COLORS.ERROR),
//               ],
//             });
//             return await handleCashAppPayment(remaining, [...invalidLinks, webReceipt.content]);
//           }
//           return loadingMessage;
//         } catch (err) {
//           await loadingMessage.delete();
//           await channel.send({
//             embeds: [
//               new Embed()
//                 .setTitle('An error occurred while processing your payment')
//                 .setDescription(
//                   'This could be due to an invalid receipt link or an error with the cash app website. Please try again later'
//                 )
//                 .setColor(COLORS.ERROR),
//             ],
//           });
//           return await handleCashAppPayment(requiredAmount);
//         }
//       };
//       const loadingMessage = await handleCashAppPayment(FEE_AMOUNT_IN_USD);
//       await loadingMessage.delete();
//       await channel.send({
//         content: ids.mention(),
//         embeds: [
//           new Embed()
//             .setTitle('Payment has been verified and received')
//             .setDescription('The mm fee has been paid and the transaction has been completed')
//             .setColor(COLORS.SUCCESS),
//         ],
//       });
//       break;
//   }
// }

export {};
