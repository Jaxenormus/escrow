import { toLower } from 'lodash';

import { EXPANDED_TRADE_TYPES, TRADE_TYPES } from '@/context';

export default function findAddressUrl(coin: TRADE_TYPES, address: string) {
  // eslint-disable-next-line no-nested-ternary
  return coin === TRADE_TYPES.BITCOIN
    ? `https://mempool.space/address/${address}`
    : coin === TRADE_TYPES.ETHEREUM
    ? `https://etherscan.io/address/${address}`
    : `https://blockchair.com/${toLower(EXPANDED_TRADE_TYPES[coin])}/address/${address}`;
}
