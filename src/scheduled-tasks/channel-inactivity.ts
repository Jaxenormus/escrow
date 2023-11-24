import { container } from "@sapphire/pieces";
import { ScheduledTask } from "@sapphire/plugin-scheduled-tasks";
import dayjs from "dayjs";
import { EmbedBuilder, time, type TextChannel, ChannelType } from "discord.js";
import { Effect, Either, pipe } from "effect";

import type { TradeMediums } from "@/src/config";
import { EmbedColors } from "@/src/config";
import { listenForMessages } from "@/src/helpers/listenForMessages";
import { scheduleInactivityTask } from "@/src/helpers/tasks/scheduleInactivityTask";
import { MessageService } from "@/src/services/Message";

export interface ChannelInactivityTaskPayload {
  id: string;
  channelId: string;
  medium: TradeMediums;
  threshold: number;
}

export class ChannelInactivityTask extends ScheduledTask {
  public constructor(context: ScheduledTask.Context, options: ScheduledTask.Options) {
    super(context, { ...options, name: "channelInactivity" });
  }

  public async run(payload: ChannelInactivityTaskPayload) {
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const channel = yield* _(Effect.tryPromise(() => container.client.channels.fetch(payload.channelId)));
        if (channel && channel.isTextBased() && channel.type === ChannelType.GuildText) {
          const lastMessage = yield* _(
            pipe(
              Effect.tryPromise(() => channel.messages.fetch({ limit: 1 })),
              Effect.map((messages) => messages.first())
            )
          );
          if (lastMessage) {
            const thresholdExceeded = dayjs().diff(lastMessage.createdAt, "millisecond") > payload.threshold;
            yield* _(container.db.deleteJob({ id: payload.id }));
            if (thresholdExceeded) {
              const [warning] = yield* _(
                Effect.all(
                  [
                    MessageService.send(channel, {
                      embeds: [
                        new EmbedBuilder()
                          .setTitle("Ticket inactivity detected.")
                          .setDescription(
                            `This ticket no longer seems to be active and will be closed in ${time(
                              dayjs().add(payload.threshold, "millisecond").toDate(),
                              "R"
                            )}.`
                          )
                          .addFields([
                            {
                              name: "If this deal is still active",
                              value: "Send a message to continue your deal. Bot will react with 👍.",
                            },
                            {
                              name: "If this deal is no longer active",
                              value: "No action is required. This ticket will be closed soon.",
                            },
                          ])
                          .setColor(EmbedColors.Loading),
                      ],
                    }),
                    container.api.statistics.trackTicketAction(channel, payload.medium, "inactive"),
                  ],
                  { concurrency: "unbounded" }
                )
              );
              const collectedMessagesEither = yield* _(
                Effect.either(
                  listenForMessages(
                    channel,
                    ({ received, endListener }) => {
                      return Effect.gen(function* (_) {
                        yield* _(
                          Effect.all(
                            [endListener, MessageService.react(received, "👍"), MessageService.delete(warning)],
                            { concurrency: "unbounded" }
                          )
                        );
                      });
                    },
                    { time: dayjs().add(payload.threshold, "millisecond").diff(warning.createdAt, "millisecond") }
                  )
                )
              );
              if (Either.isRight(collectedMessagesEither)) {
                yield* _(scheduleInactivityTask(channel, payload.threshold, payload));
              } else {
                yield* _(
                  Effect.all(
                    [
                      container.api.statistics.trackTicketAction(channel as TextChannel, payload.medium, "stale"),
                      MessageService.send(channel, "$close"),
                    ],
                    { concurrency: "unbounded" }
                  )
                );
              }
            } else {
              yield* _(
                scheduleInactivityTask(
                  channel,
                  dayjs().add(payload.threshold, "millisecond").diff(lastMessage.createdAt, "millisecond"),
                  payload
                )
              );
            }
          }
        }
      })
    );
  }
}

declare module "@sapphire/plugin-scheduled-tasks" {
  interface ScheduledTasks {
    channelInactivity: never;
  }
}
