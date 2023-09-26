import { container } from "@sapphire/pieces";

import { TradeMediums } from "@/src/config";

export const resolveNetwork = (coin: TradeMediums) => {
  const isProduction = container.environment === "production";
  switch (coin) {
    case TradeMediums.Ethereum:
      return isProduction ? "eth/main" : "beth/test";
    case TradeMediums.Bitcoin:
      return isProduction ? "btc/main" : "bcy/test";
    case TradeMediums.Litecoin:
      return isProduction ? "ltc/main" : "bcy/test";
    default:
      return "";
  }
};
