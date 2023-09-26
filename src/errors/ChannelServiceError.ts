import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class ChannelServiceError extends ExpectedExecutionError {
  constructor(
    readonly error: unknown,
    readonly action: string
  ) {
    super(
      "ChannelServiceError",
      `An error occurred while performing the ${action} channel action.`,
      `An error occurred while performing the ${action} channel action. Please reopen the ticket and try again.`,
      error
    );
  }
}
