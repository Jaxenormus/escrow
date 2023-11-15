import { ScheduledTask } from "@sapphire/plugin-scheduled-tasks";
import dayjs from "dayjs";
import { EmbedBuilder, time, type TextChannel } from "discord.js";
import { Effect } from "effect";

import type { TradeMediums } from "@/src/config";
import { ChannelInactivityThreshold, EmbedColors } from "@/src/config";
import { scheduleInactivityTask } from "@/src/helpers/tasks/scheduleInactivityTask";

export interface ChannelInactivityTaskPayload {
  id: string;
  channelId: string;
  deleteChannel: boolean;
  medium: TradeMediums;
}

export class ChannelInactivityTask extends ScheduledTask {
  public constructor(context: ScheduledTask.Context, options: ScheduledTask.Options) {
    super(context, { ...options, name: "channelInactivity" });
  }

  public async run(payload: ChannelInactivityTaskPayload) {
    const channel = await this.container.client.channels.fetch(payload.channelId);
    if (channel?.isTextBased()) {
      const lastMessage = (await channel.messages.fetch({ limit: 1 })).first();
      if (lastMessage) {
        const thresholdExceeded = dayjs().diff(lastMessage.createdAt, "millisecond") > ChannelInactivityThreshold;
        await Effect.runPromise(this.container.db.deleteJob({ id: payload.id }));
        if (thresholdExceeded) {
          if (payload.deleteChannel) {
            await Effect.runPromise(
              this.container.api.statistics.trackTicketAction(channel as TextChannel, payload.medium, "stale")
            );
            await channel.send("$close");
          } else {
            const warning = await channel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Ticket inactivity threshold reached")
                  .setDescription(
                    `The ticket will be closed in ${time(
                      dayjs().add(ChannelInactivityThreshold, "millisecond").toDate(),
                      "R"
                    )} due to inactivity.\n\n• If the deal is still active send a message to mark this ticket as active\n• If the deal is not active no further action is required and ticket will be deleted.`
                  )
                  .setColor(EmbedColors.Loading),
              ],
            });
            await Effect.runPromise(
              Effect.all([
                this.container.api.statistics.trackTicketAction(channel as TextChannel, payload.medium, "inactive"),
                scheduleInactivityTask(
                  channel as TextChannel,
                  dayjs().add(ChannelInactivityThreshold, "millisecond").diff(warning.createdAt, "millisecond"),
                  { deleteChannel: true, medium: payload.medium }
                ),
              ])
            );
          }
        } else {
          await Effect.runPromise(
            scheduleInactivityTask(
              channel as TextChannel,
              dayjs().add(ChannelInactivityThreshold, "millisecond").diff(lastMessage.createdAt, "millisecond"),
              { deleteChannel: false, medium: payload.medium }
            )
          );
        }
      }
    }
  }
}

declare module "@sapphire/plugin-scheduled-tasks" {
  interface ScheduledTasks {
    channelInactivity: never;
  }
}
