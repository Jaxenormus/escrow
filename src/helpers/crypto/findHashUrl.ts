import { toLower } from "lodash";

import { TradeMediums } from "@/src/config";

export const findHashUrl = (type: TradeMediums, hash: string) => {
  return type === TradeMediums.Bitcoin
    ? `https://mempool.space/tx/${hash}`
    : type === TradeMediums.Ethereum
    ? `https://etherscan.io/tx/0x${hash}`
    : `https://blockchair.com/${toLower(type)}/transaction/${hash}`;
};
