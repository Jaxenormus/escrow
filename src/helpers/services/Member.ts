import { container } from "@sapphire/pieces";
import { DiscordAPIError, type Guild } from "discord.js";
import { Effect, Either } from "effect";

import { MemberServiceError } from "@/src/errors/MemberServiceError";

export class MemberService {
  static addRole(guild: Guild, roleId: string, memberId: string) {
    return Effect.gen(function* (_) {
      const memberEither = yield* _(Effect.either(Effect.tryPromise(() => guild.members.fetch(memberId))));
      if (Either.isRight(memberEither)) {
        const roleEither = yield* _(Effect.either(Effect.tryPromise(() => memberEither.right.roles.add(roleId))));
        if (Either.isRight(roleEither)) {
          return memberEither.right;
        } else {
          throw new MemberServiceError(roleEither.left, "addRole");
        }
      } else {
        throw new MemberServiceError(memberEither.left, "fetchUser");
      }
    });
  }
  static fetch(guild: Guild, memberId: string) {
    return Effect.tryPromise({
      try: () => guild.members.fetch(memberId),
      catch: (unknown) => {
        container.sentry.captureException(unknown);
        if (unknown instanceof DiscordAPIError) {
          return new MemberServiceError(unknown.message, "fetch");
        } else {
          return new MemberServiceError(unknown, "fetch");
        }
      },
    });
  }
}
