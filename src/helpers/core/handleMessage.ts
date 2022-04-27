import { Promise } from 'bluebird';
import { Message, MessageCollectorOptions, TextBasedChannel } from 'discord.js';

export default function handleMessage(
  channel: TextBasedChannel,
  onMessage: (m: Message, end: () => void) => Promise<void>,
  options?: MessageCollectorOptions
): Promise<Message> {
  return new Promise(resolve => {
    const collector = channel
      .createMessageCollector(options)
      .on('collect', async m => {
        await onMessage(m, () => {
          collector.stop();
          resolve(m);
        });
      })
      .on('end', () => {
        /* silently ignore */
      });
  });
}
