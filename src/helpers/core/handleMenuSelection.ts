import {
  InteractionCollectorOptions,
  Message,
  MessageComponentInteraction,
  User,
} from 'discord.js';

import handleInteractions from './handleInteractions';

export default async function handleMenuSelection<T = string>(
  message: Message,
  options?: InteractionCollectorOptions<MessageComponentInteraction>
): Promise<{ value: T; user: User }> {
  return new Promise(resolve => {
    handleInteractions(
      message,
      async (interaction, end) => {
        if (interaction.isSelectMenu()) {
          end();
          resolve({ value: interaction.values[0] as T, user: interaction.user });
        }
      },
      { ...options }
    );
  });
}
