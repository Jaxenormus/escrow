import { TRADE_TYPES } from '@/context';

// eslint-disable-next-line consistent-return
export default function resolveNetwork(coin: TRADE_TYPES): string {
  const isProd = process.env.NODE_ENV === 'production';
  if (coin === TRADE_TYPES.ETHEREUM) {
    return isProd ? 'eth/main' : 'beth/test';
  }
  if (coin === TRADE_TYPES.BITCOIN) {
    return isProd ? 'btc/main' : 'bcy/test';
  }
  if (coin === TRADE_TYPES.LITECOIN) {
    return isProd ? 'ltc/main' : 'bcy/test';
  }
}
