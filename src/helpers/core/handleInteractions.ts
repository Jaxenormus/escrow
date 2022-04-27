import { Promise } from 'bluebird';
import {
  ButtonInteraction,
  InteractionCollectorOptions,
  Message,
  MessageComponentInteraction,
  SelectMenuInteraction,
} from 'discord.js';

async function handleInteractions<T extends any>(
  message: Message,
  onInteraction: (
    interaction: SelectMenuInteraction | ButtonInteraction,
    end: (returnValue?: T) => void
  ) => void,
  collectorOptions?: InteractionCollectorOptions<MessageComponentInteraction>,
  options?: { avoidUpdate?: boolean }
): Promise<T> {
  return new Promise(resolve => {
    const collector = message
      .createMessageComponentCollector(collectorOptions)
      .on('collect', async i => {
        if (!options?.avoidUpdate) await i.deferUpdate();
        if (i.isButton() || i.isSelectMenu()) {
          onInteraction(i, (returnValue: T) => {
            collector.stop();
            resolve(returnValue);
          });
        }
      })
      .on('end', () => {
        /* silently ignore */
      });
  });
}

export default handleInteractions;
