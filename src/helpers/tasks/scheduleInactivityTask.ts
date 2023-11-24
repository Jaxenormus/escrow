import { container } from "@sapphire/pieces";
import type { TextChannel } from "discord.js";
import { Effect } from "effect";
import { v4 } from "uuid";

import type { ChannelInactivityTaskPayload } from "@/src/scheduled-tasks/channel-inactivity";

export const scheduleInactivityTask = (
  channel: TextChannel,
  interval: number,
  options?: Omit<ChannelInactivityTaskPayload, "channelId" | "id" | "threshold"> & { threshold?: number }
) => {
  return Effect.gen(function* (_) {
    const job = yield* _(
      Effect.promise(async () => {
        const jobId = v4();
        const job = await container.tasks.create(
          "channelInactivity",
          { ...options, id: jobId, channelId: channel.id, threshold: interval } as ChannelInactivityTaskPayload,
          { repeated: false, delay: interval, customJobOptions: { jobId, removeOnComplete: true } }
        );
        return job;
      })
    );
    if (job?.id) yield* _(container.db.createJob({ id: job.id, channelId: channel.id }));
  });
};
