import { MessageActionRow, MessageSelectMenu, TextBasedChannel } from 'discord.js';

import Embed from '@/classes/Embed';
import { EMOJIS, EXPANDED_TRADE_TYPES, INTERACTIONS, TRADE_TYPES } from '@/context';

import handleMenuSelection from '../core/handleMenuSelection';

export default async function handleCoinSelect(
  channel: TextBasedChannel,
  title: string,
  description: string
): Promise<TRADE_TYPES> {
  const msg = await channel.send({
    embeds: [
      new Embed({
        title,
        description,
      }),
    ],
    components: [
      new MessageActionRow().addComponents(
        new MessageSelectMenu().setCustomId(INTERACTIONS.CRYPTO_COIN_SELECTION_MENU).addOptions([
          {
            label: TRADE_TYPES.BITCOIN,
            description: EXPANDED_TRADE_TYPES[TRADE_TYPES.BITCOIN],
            value: TRADE_TYPES.BITCOIN,
            emoji: EMOJIS.BITCOIN,
          },
          {
            label: TRADE_TYPES.ETHEREUM,
            description: EXPANDED_TRADE_TYPES[TRADE_TYPES.ETHEREUM],
            value: TRADE_TYPES.ETHEREUM,
            emoji: EMOJIS.ETHEREUM,
          },
          {
            label: TRADE_TYPES.LITECOIN,
            description: EXPANDED_TRADE_TYPES[TRADE_TYPES.LITECOIN],
            value: TRADE_TYPES.LITECOIN,
            emoji: EMOJIS.LITECOIN,
          },
        ])
      ),
    ],
  });
  const selection = await handleMenuSelection<TRADE_TYPES>(msg);
  await msg.delete();
  return selection.value;
}
