import { container } from '@sapphire/framework';
import { Formatters, MessageActionRow, MessageButton, TextBasedChannel } from 'discord.js';

import Embed from '@/classes/Embed';
import Identities from '@/classes/Identities';
import { COLORS, CRYPTO_CONFIRMATIONS, INTERACTIONS, PARTIES, TRADE_TYPES } from '@/context';
import UnableToReleaseCrypto from '@/errors/UnableToReleaseCrypto';

import handleInteractions from '../core/handleInteractions';
import findHashUrl from './utils/findHashUrl';
import releaseHeldCrypto from './utils/releaseHeldCrypto';
import waitForConfirmation from './utils/waitForConfirmation';

export default async function handleRelease(
  coin: TRADE_TYPES,
  channel: TextBasedChannel,
  destination: string,
  tempAddress: string,
  ids: Identities,
  party: PARTIES,
  options?: { isRefund?: boolean }
) {
  try {
    const hash = await releaseHeldCrypto(coin, tempAddress, destination);
    const msg = await channel.send({
      embeds: [
        new Embed()
          .setTitle(`${coin} Released. Waiting for confirmation.`)
          .setDescription(
            `The funds have been released and now awaiting confirmation. This may take a few minutes.`
          )
          .addFields([
            { name: 'Hash', value: `${Formatters.hyperlink(hash, findHashUrl(coin, hash))}` },
          ])
          .setColor(COLORS.SUCCESS),
      ],
    });
    await waitForConfirmation(coin, hash, CRYPTO_CONFIRMATIONS[coin], false);
    await msg.delete();
    await channel.send({
      content: ids.mention(party),
      embeds: [
        new Embed()
          .setTitle(options?.isRefund ? 'Refund Completed' : 'Trade Completed')
          .setDescription(
            options?.isRefund
              ? 'The trade has been canceled and the funds have been refunded.'
              : 'The trade is completed and the funds have been released.'
          )
          .addFields([
            { name: 'Hash', value: `${Formatters.hyperlink(hash, findHashUrl(coin, hash))}` },
          ])
          .setColor(COLORS.SUCCESS),
      ],
    });
  } catch (e) {
    container.sentry.handleException(e);
    const embed = new Embed()
      .setTitle(options?.isRefund ? 'Funds Return Failed' : 'Funds Release Failed')
      .setDescription(
        'An error occurred while completing this action. Contact a middleman for further steps on how to get your funds.'
      )
      .setColor(COLORS.ERROR);
    if (e instanceof UnableToReleaseCrypto) {
      if (e.errors) {
        embed.addFields(
          (e.errors ?? []).map((error, index) => ({
            name: `Error Message #${index + 1}`,
            value: error,
          }))
        );
      }
    } else {
      embed.addFields([{ name: 'Error Message', value: e.message ?? 'Unknown error.' }]);
    }
    const msg = await channel.send({
      embeds: [embed],
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId(INTERACTIONS.CRYPTO_RELEASE_RETRY_BUTTON)
            .setLabel('Retry')
            .setStyle('PRIMARY')
        ),
      ],
    });
    await handleInteractions(
      msg,
      i => {
        if (
          i.customId === INTERACTIONS.CRYPTO_RELEASE_RETRY_BUTTON &&
          i.user.id === ids.get(party)
        ) {
          handleRelease(coin, channel, destination, tempAddress, ids, party, options);
        }
      },
      { filter: i => i.isButton() }
    );
  }
}
