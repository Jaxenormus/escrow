import { container } from '@sapphire/framework';

import { TRADE_TYPES } from '@/context';
import UnableToCalculatePrice from '@/errors/UnableToCalculatePrice';

import { CoinMarketPriceConversionResponse } from './findCoinAmount';

/**
 * This function will calculate how much crypto is worth in fiat amount.
 * @param coin - The coin to check the price for.
 * @param price - The price to check.
 * @returns The amount of crypto the price is.
 */
export default async function findFiatAmount(coin: TRADE_TYPES, price: string): Promise<number> {
  try {
    const { data } = await container.coinmarketcap.get<CoinMarketPriceConversionResponse>(
      'tools/price-conversion',
      {
        params: { amount: price, symbol: coin, convert: 'USD' },
        headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY },
      }
    );
    if (data.status.error_code !== 0) throw new Error(data.status.error_message);
    return data.data[0].quote.USD.price;
  } catch (e) {
    container.sentry.handleException(e);
    throw new UnableToCalculatePrice(coin);
  }
}
