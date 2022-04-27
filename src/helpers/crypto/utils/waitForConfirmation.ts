import { container } from '@sapphire/framework';
import interval from 'interval-promise';

import { TRADE_TYPES } from '@/context';

interface ResponseBody {
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
  outputs: { value: number; script: string; addresses: string[] }[];
}

export default async function waitForConfirmation(
  coin: TRADE_TYPES,
  txHash: string,
  confirmations: number,
  isStopped?: boolean
): Promise<ResponseBody> {
  return new Promise(resolve => {
    interval(
      async (_, stop) => {
        if (isStopped) stop();
        const { data } = await container.blockcypher(coin).get(`/txs/${txHash}`);
        if (data.confirmations >= confirmations) {
          stop();
          resolve(data);
        }
      },
      // eslint-disable-next-line no-nested-ternary
      coin === TRADE_TYPES.BITCOIN ? 120_000 : coin === TRADE_TYPES.ETHEREUM ? 30_000 : 60_000
    );
  });
}
