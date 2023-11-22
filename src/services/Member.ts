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
          return yield* _(Effect.succeed(memberEither.right));
        } else {
          return yield* _(Effect.fail(new MemberServiceError(roleEither.left, "addRole")));
        }
      } else {
        return yield* _(Effect.fail(new MemberServiceError(memberEither.left, "addRole")));
      }
    });
  }
  static fetch(guild: Guild, memberId: string) {
    return Effect.tryPromise({
      try: () => guild.members.fetch(memberId),
      catch: (unknown) => {
        if (unknown instanceof DiscordAPIError) {
          return new MemberServiceError(unknown.message, "fetch");
        } else {
          return new MemberServiceError(unknown, "fetch");
        }
      },
    });
  }
}
