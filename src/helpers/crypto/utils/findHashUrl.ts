import { toLower } from 'lodash';

import { EXPANDED_TRADE_TYPES, TRADE_TYPES } from '@/context';

export default function findHashUrl(coin: TRADE_TYPES, hash: string) {
  // eslint-disable-next-line no-nested-ternary
  return coin === TRADE_TYPES.BITCOIN
    ? `https://mempool.space/tx/${hash}`
    : coin === TRADE_TYPES.ETHEREUM
    ? `https://etherscan.io/tx/0x${hash}`
    : `https://blockchair.com/${toLower(EXPANDED_TRADE_TYPES[coin])}/transaction/${hash}`;
}
