import type { TextChannel, Message, MessageCreateOptions } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, userMention } from "discord.js";
import { Effect, Ref } from "effect";

import { EmbedColors, Interactions } from "@/src/config";
import type { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";
import { listenForInteractions } from "@/src/helpers/listenForInteractions";
import { MessageService } from "@/src/services/Message";
import AdminOnlyPrecondition from "@/src/preconditions/roles/adminOnly";

export function promptQuestion(
  channel: TextChannel,
  content: MessageCreateOptions | EmbedBuilder,
  respondents: string[],
  buttons: { confirm: string; deny: string },
  options?: {
    denyIsConfirm?: boolean;
    staffOverridable?: boolean;
    acknowledgeResponse?: boolean;
    dangerousActions?: boolean;
  }
): Effect.Effect<
  never,
  ExpectedExecutionError,
  { message: Message; consensus: boolean; confirmations: Map<string, boolean | null>; overriddenBy: string | null }
> {
  return Effect.gen(function* (_) {
    const overriddenByRef = yield* _(Ref.make<string | null>(null));
    const confirmationsRef = yield* _(
      Ref.make<Map<string, boolean | null>>(new Map(respondents.map((id) => [id, null])))
    );
    const messagesRef = yield* _(Ref.make<Message[]>([]));
    const message = yield* _(
      MessageService.send(channel, {
        ...(content instanceof EmbedBuilder ? { embeds: [content] } : content),
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(Interactions.PromptQuestionConfirmButton)
              .setStyle(options?.dangerousActions ? ButtonStyle.Success : ButtonStyle.Primary)
              .setLabel(buttons.confirm),
            new ButtonBuilder()
              .setCustomId(Interactions.PromptQuestionDenyButton)
              .setStyle(options?.dangerousActions ? ButtonStyle.Danger : ButtonStyle.Secondary)
              .setLabel(buttons.deny)
          ),
        ],
      })
    );
    yield* _(
      listenForInteractions(message, (i, end) =>
        Effect.gen(function* (_) {
          const confirmations = yield* _(Ref.get(confirmationsRef));
          const isParticipant = confirmations.has(i.user.id);
          const isConfirm = i.customId === Interactions.PromptQuestionConfirmButton;
          const isAdmin = AdminOnlyPrecondition.isAdmin(i.user.id);
          const response = isConfirm ? buttons.confirm : buttons.deny;
          if (options?.staffOverridable && isAdmin && !isParticipant) {
            yield* _(Ref.set(overriddenByRef, i.user.id));
            yield* _(Ref.set(confirmationsRef, new Map(Array.from(confirmations.keys()).map((id) => [id, isConfirm]))));
            yield* _(
              MessageService.send(channel, {
                embeds: [
                  new EmbedBuilder({
                    description: `${userMention(
                      i.user.id
                    )} has overridden the confirmation with the response "${response}"`,
                    color: isConfirm ? EmbedColors.Success : EmbedColors.Error,
                  }),
                ],
              })
            );
            return end();
          } else if (isParticipant) {
            if (options?.acknowledgeResponse) {
              const onmsg = yield* _(
                MessageService.send(channel, {
                  embeds: [
                    new EmbedBuilder({
                      description: `${userMention(i.user.id)} has responded "${response}"`,
                      color: isConfirm ? EmbedColors.Success : EmbedColors.Error,
                    }),
                  ],
                })
              );
              yield* _(Ref.update(messagesRef, (msgs) => [...msgs, onmsg]));
            }
            if (isConfirm) {
              if (options?.denyIsConfirm) {
                end();
              } else {
                confirmations.set(i.user.id, true);
              }
            } else if (!isConfirm) {
              if (options?.denyIsConfirm) {
                confirmations.set(i.user.id, true);
              } else {
                end();
              }
            }
          }
          if (Array.from(confirmations.values()).every((c) => c)) end();
        })
      )
    );

    if (options?.acknowledgeResponse) {
      const messages = yield* _(Ref.get(messagesRef));
      yield* _(MessageService.batchDelete(messages));
    }

    const confirmations = yield* _(Ref.get(confirmationsRef));
    const overriddenBy = yield* _(Ref.get(overriddenByRef));
    return { message, consensus: Array.from(confirmations.values()).every((c) => c), confirmations, overriddenBy };
  });
}
