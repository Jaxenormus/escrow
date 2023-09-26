import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class GenericError extends ExpectedExecutionError {
  constructor(readonly error: unknown) {
    super(
      "GenericError",
      "An unknown error occurred.",
      "An unknown error occurred. Please reopen the ticket and try again.",
      error
    );
  }
}
