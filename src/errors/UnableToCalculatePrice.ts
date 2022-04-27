import { TRADE_TYPES } from '@/context';

export default class UnableToCalculatePrice extends Error {
  coin: TRADE_TYPES;

  constructor(coin: TRADE_TYPES) {
    super();
    this.name = 'UnableToCalculatePrice';
    this.coin = coin;
    this.message = `Failed to calculate the price of ${coin}.`;
  }
}
