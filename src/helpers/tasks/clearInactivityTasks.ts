import { container } from "@sapphire/pieces";
import type { TextChannel } from "discord.js";
import { Effect, pipe } from "effect";

export const clearInactivityTasks = (channel: TextChannel) => {
  return Effect.gen(function* (_) {
    const jobs = yield* _(container.db.findJobs({ channelId: channel.id }));
    yield* _(
      pipe(
        jobs,
        Effect.forEach((job) =>
          Effect.all([Effect.promise(() => container.tasks.delete(job.id)), container.db.deleteJob({ id: job.id })])
        )
      )
    );
  });
};
