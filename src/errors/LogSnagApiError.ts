import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class LogSnagApiError extends ExpectedExecutionError {
  constructor(readonly error: unknown) {
    super(
      "LogSnagApiError",
      "An error occurred while communicating with Logsnag.",
      "An error occurred while communicating with Logsnag. Please reopen the ticket and try again.",
      error
    );
  }
}
