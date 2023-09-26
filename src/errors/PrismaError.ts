import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class PrismaError extends ExpectedExecutionError {
  constructor(readonly error: unknown) {
    super(
      "PrismaError",
      "An error occurred while communicating with the database.",
      "An error occurred while communicating with the database. Please reopen the ticket and try again.",
      error
    );
  }
}
