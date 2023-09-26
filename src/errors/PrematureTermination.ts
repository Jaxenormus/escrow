import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class PrematureTerminationError extends ExpectedExecutionError {
  constructor() {
    super(
      "PrematureTerminationError",
      "Your ticket was ended prematurely.",
      "Your ticket was ended prematurely. Please reopen the ticket and try again.",
      "none"
    );
  }
}
