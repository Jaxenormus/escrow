import { toLower } from "lodash";

import { TradeMediums } from "@/src/config";

export const findAddressUrl = (type: TradeMediums, address: string) => {
  return type === TradeMediums.Bitcoin
    ? `https://mempool.space/address/${address}`
    : type === TradeMediums.Ethereum
    ? `https://etherscan.io/address/${address}`
    : `https://blockchair.com/${toLower(type)}/address/${address}`;
};
