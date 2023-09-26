import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class InteractionServiceError extends ExpectedExecutionError {
  constructor(readonly error: unknown, readonly action: string) {
    super(
      "InteractionServiceError",
      `An error occurred while performing the ${action} interaction action.`,
      `An error occurred while performing the ${action} interaction action. Please reopen the ticket and try again.`,
      error
    );
  }
}
