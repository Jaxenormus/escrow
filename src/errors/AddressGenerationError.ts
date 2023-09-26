import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class AddressGenerationError extends ExpectedExecutionError {
  constructor(readonly error: unknown) {
    super(
      "AddressGenerationError",
      "An error occurred while generating a bot address.",
      "An error occurred while generating a bot address. Please reopen the ticket and try again.",
      error
    );
  }
}
