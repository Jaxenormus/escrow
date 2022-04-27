import { container } from '@sapphire/framework';
import { CryptoDealAmount } from 'index';
import sb from 'satoshi-bitcoin';
import web3 from 'web3';

import { TRADE_TYPES } from '@/context';

export interface Output {
  value: number;
  script: string;
  addresses: string[];
}

export interface Tx {
  block_hash: string;
  block_height: number;
  block_index: number;
  hash: string;
  addresses: string[];
  total: number;
  fees: number;
  size: number;
  relayed_by: string;
  confirmed: string;
  received: string;
  ver: number;
  double_spend: boolean;
  vin_sz: number;
  vout_sz: number;
  confirmations: number;
  confidence: number;
  inputs: { sequence: number; addresses: string[] }[];
  outputs: Output[];
}

export type ReturnType = 'VALID' | 'UNDERPAID' | 'INCORRECT_ADDRESS' | 'INVALID' | string;

/**
 * This function will validate the transaction hash.
 * @param coin - The coin to check the transaction for.
 * @param address - The address where the transaction was sent to.
 * @param amount - The amount of the transaction in satoshis or wei.
 * @param txHash - The transaction hash to check.
 * @returns Wether the transaction is valid or not.
 * */
export default async function validateHash(
  coin: TRADE_TYPES,
  address: string,
  amount: CryptoDealAmount,
  txHash: string
): Promise<{
  status: ReturnType;
  output: Output | null;
}> {
  return container
    .blockcypher(coin)
    .get<Tx>(`/txs/${txHash}`, { params: { limit: 9999 } })
    .then(({ data }) => {
      const addy = coin === TRADE_TYPES.ETHEREUM ? address.slice(2) : address;
      const outputData = data.outputs.find(output => output.addresses.includes(addy));
      if (!outputData) return { status: 'INVALID', output: null };
      const validAmount =
        coin === TRADE_TYPES.ETHEREUM
          ? web3.utils
              .toBN(outputData.value.toString())
              .gte(web3.utils.toBN(web3.utils.toWei(amount.raw_crypto.toString())).muln(0.98))
          : outputData.value >= sb.toSatoshi(amount.crypto) * 0.98;
      return { status: validAmount ? 'VALID' : 'UNDERPAID', output: outputData };
    })
    .catch(() => ({ status: 'INVALID', output: null }));
}
