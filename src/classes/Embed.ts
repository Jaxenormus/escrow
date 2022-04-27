import { MessageEmbed, MessageEmbedOptions } from 'discord.js';
import { isNil } from 'lodash';

import { COLORS } from '@/context';

export default class Embed extends MessageEmbed {
  constructor(data?: MessageEmbed | MessageEmbedOptions) {
    super(data);
    if (isNil(data?.color)) {
      this.setColor(COLORS.MAIM);
    }
  }
}
