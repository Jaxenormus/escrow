import { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";

export class CoinMarketCapApiError extends ExpectedExecutionError {
  constructor(readonly error: unknown) {
    super(
      "CoinMarketCapApiError",
      "An error occurred while communicating with CoinMarketCap.",
      "An error occurred while communicating with CoinMarketCap. Please reopen the ticket and try again.",
      error
    );
  }
}
