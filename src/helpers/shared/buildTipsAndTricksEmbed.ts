import { Formatters } from 'discord.js';

import Embed from '@/classes/Embed';
import { PARTIES, TRADE_TYPES } from '@/context';

export default function buildTipsAndTricksEmbed(type: TRADE_TYPES, party: PARTIES): Embed {
  const tips = [];
  const embed = new Embed().setTitle('Escrow Tips & Tricks');
  tips.push('Please be aware that our bot will **NOT** direct message you during the deal.');
  // eslint-disable-next-line default-case
  switch (type) {
    case TRADE_TYPES.LIMITEDS:
      tips.push(
        `Account is underage? Use ${Formatters.inlineCode(
          '/friend'
        )} for the bot to send a friend request.`
      );
      if (party === PARTIES.SENDER) {
        tips.push('Doing a mass deal? Make sure to send a small each trade.');
      }
  }
  embed.setDescription(tips.map(tip => `• ${tip}`).join('\n'));
  return embed;
}
