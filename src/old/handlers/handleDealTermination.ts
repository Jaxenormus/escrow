// import type { TextBasedChannel } from 'discord.js';

// import { TRADE_EVENTS } from '@/src/context';
// import EarlyTerminationError from '@/src/old/errors/EarlyTerminationError';

// export default async function handleDealTermination(
//   channel: TextBasedChannel,
//   handleTermination: (error: EarlyTerminationError) => void
// ): Promise<void> {
//   process.on(channel.id, (event: TRADE_EVENTS) => {
//     if (event === TRADE_EVENTS.TERMINATED) {
//       handleTermination(new EarlyTerminationError(channel.id));
//     }
//   });
// }

export {};
