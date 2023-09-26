import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class BlockCypherApiError extends ExpectedExecutionError {
  constructor(readonly error: unknown) {
    super(
      "BlockCypherApiError",
      "An error occurred while communicating with the crypto API.",
      "An error occurred while communicating with the crypto API. Please reopen the ticket and try again.",
      error
    );
  }
}
