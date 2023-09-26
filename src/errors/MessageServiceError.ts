
import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class MessageServiceError extends ExpectedExecutionError {
  constructor(readonly error: unknown, readonly action: string) {
    super(
      "MessageServiceError",
      `An error occurred while performing the ${action} message action.`,
      `An error occurred while performing the ${action} message action. Please reopen the ticket and try again.`,
      error
    );
  }
}
