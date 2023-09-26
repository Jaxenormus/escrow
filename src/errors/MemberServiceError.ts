import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class MemberServiceError extends ExpectedExecutionError {
  constructor(readonly error: unknown, readonly action: string) {
    super(
      "MemberServiceError",
      `An error occurred while performing the ${action} member action.`,
      `An error occurred while performing the ${action} member action. Please reopen the ticket and try again.`,
      error
    );
  }
}
