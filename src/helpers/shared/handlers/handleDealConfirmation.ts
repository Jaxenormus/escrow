import { Formatters, TextBasedChannel } from 'discord.js';
import { DealConfirmationVerdict } from 'index';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, EXPANDED_TRADE_TYPES, PARTIES, RESPONSES, TRADE_TYPES } from '@/context';

import handleQuestion from '../../core/handleQuestion';

// eslint-disable-next-line consistent-return
export default async function handleDealConfirmation(
  type: TRADE_TYPES,
  channel: TextBasedChannel,
  ids: Identities
): Promise<DealConfirmationVerdict> {
  const itemsTrade = TRADE_TYPES.LIMITEDS === type;
  const cryptoTrade = [TRADE_TYPES.BITCOIN, TRADE_TYPES.LITECOIN, TRADE_TYPES.LITECOIN].includes(
    type
  );
  const [message, { allConfirmed, confirmations }] = await handleQuestion(
    channel,
    {
      content: ids.mention(),
      embeds: [
        new Embed()
          .setTitle('You may proceed with the trade.')
          .setDescription(
            `${ids.mention(
              PARTIES.RECEIVER
            )} you may now send whatever you agreed upon to ${ids.mention(
              PARTIES.SENDER
            )}. Once the trade is complete the sender must click the button below to finish the trade.`
          )
          .setFooter({ text: 'Sender must confirm this message to continue.' }),
      ],
    },
    [ids.sender],
    {
      // eslint-disable-next-line no-nested-ternary
      CONFIRM: itemsTrade ? 'Payment Received' : cryptoTrade ? `Release ${type}` : 'Done',
      DENY: 'Cancel Deal',
    },
    { staffOverridable: true, dangerousActions: true }
  );
  let status: DealConfirmationVerdict = 'RELEASE';
  const cancelledBy = Array.from(confirmations.entries()).filter(([, value]) => !value)[0]?.[0];
  if (!allConfirmed) {
    const [confirmationMessage, { confirmations: cancelationResponses }] = await handleQuestion(
      channel,
      new Embed()
        .setTitle('Deal cancelation confirmation')
        .setDescription(
          `The deal has been canceled by ${Formatters.userMention(
            cancelledBy
          )}, and all parties must agree to these terms:`
        )
        .addFields([
          {
            name: '1. Acknowledge that this action is irreversible',
            value:
              'I understand that this deal is being cancelled and will not be able to be undone',
          },
          {
            name: '2. Acknowledge nothing has been exchanged',
            value: 'That no item, product, services, or anything has been exchanged',
          },
          {
            name: `3. Acknowledge the ${EXPANDED_TRADE_TYPES[type]} will be returned`,
            value: `I understand that ${Formatters.userMention(
              ids.sender
            )} will receive a refund without a staff member confirmation`,
          },
        ])
        .setColor(COLORS.WARNING),
      ids.both,
      { CONFIRM: 'Yes', DENY: 'No' },
      { staffOverridable: true, acknowledgeResponse: true, dangerousActions: true }
    );
    const values = Array.from(cancelationResponses.values());
    if (values.every(value => value)) status = 'RETURN';
    else if (values.every(value => !value)) status = 'RESTART';
    else if (values.some(value => value)) status = 'CANCEL';
    await confirmationMessage.delete();
  }
  if (status === 'RETURN' || status === 'CANCEL') return status;
  const secondaryConfirmed = (status === 'RELEASE' || allConfirmed) && status !== 'RESTART';
  let releaseHoldings = false;
  if (secondaryConfirmed) {
    const [secondaryMessage, { allConfirmed: secondary }] = await handleQuestion(
      channel,
      {
        content: ids.mention(PARTIES.SENDER),
        embeds: [
          new Embed({
            title: 'Are you sure you this deal is complete?',
            description:
              'By continuing, you are confirming that the money is not pending and if paying with crypto that the transaction has reached the required amount of confirmations',
          }),
        ],
      },
      [ids.sender],
      RESPONSES.SIMPLE,
      { staffOverridable: true }
    );
    releaseHoldings = secondary;
    await secondaryMessage.delete();
  }
  if (!releaseHoldings) {
    await message.delete();
    return handleDealConfirmation(type, channel, ids);
  }
  return 'RELEASE';
}
