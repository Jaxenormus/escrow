import { container } from '@sapphire/framework';

import { TRADE_TYPES } from '@/context';
import UnableToCalculatePrice from '@/errors/UnableToCalculatePrice';

export interface CoinMarketPriceConversionResponse {
  data: {
    symbol: string;
    id: string;
    name: string;
    amount: number;
    last_updated: string;
    quote: { [key: string]: { price: number; last_updated: string } };
  }[];
  status: {
    timestamp: string;
    error_code: number;
    error_message: string;
    elapsed: number;
    credit_count: number;
  };
}

/**
 * This function will calculate how much crypto is worth in fiat amount.
 * @param coin - The coin to check the price for.
 * @param price - The price to check.
 * @returns The amount of crypto the price is.
 */
export default async function findCoinAmount(coin: TRADE_TYPES, price: number): Promise<number> {
  try {
    const { data } = await container.coinmarketcap.get<CoinMarketPriceConversionResponse>(
      'tools/price-conversion',
      {
        params: { amount: price, symbol: 'USD', convert: coin },
        headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY },
      }
    );
    if (data.status.error_code !== 0) throw new Error(data.status.error_message);
    return data.data[0].quote[coin].price;
  } catch (e) {
    container.sentry.handleException(e);
    throw new UnableToCalculatePrice(coin);
  }
}
