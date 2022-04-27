import { getPublicKey, sign, utils } from '@noble/secp256k1';
import { container } from '@sapphire/framework';

import { TRADE_TYPES } from '@/context';
import Address from '@/entities/Address';
import UnableToReleaseCrypto from '@/errors/UnableToReleaseCrypto';
import UnableToSignTransaction from '@/errors/UnableToSignTransaction';

interface TXSkeleton {
  tx: {
    block_height: number;
    block_index: number;
    hash: string;
    addresses: string[];
    total: number;
    fees: number;
    size: number;
  };
  tosign: string[];
  errors: { [key: string]: string }[];
  signatures: string[];
  pubkeys: string[];
}

export default async function releaseHeldCrypto(
  coin: TRADE_TYPES,
  rawAddress: string,
  destination: string
): Promise<string> {
  return container
    .blockcypher(coin)
    .post<TXSkeleton>('/txs/new', {
      inputs: [{ addresses: [rawAddress] }],
      outputs: [{ addresses: [destination], value: -1 }],
    })
    .then(
      async ({ data }) => {
        const { privateKey } = await container.db.em.findOne(Address, { address: rawAddress });
        const pubKey = utils.bytesToHex(getPublicKey(privateKey, true));
        const sigObj = await sign(data.tosign[0], privateKey);
        const signature = utils.bytesToHex(sigObj);
        if (signature) {
          return container
            .blockcypher(coin)
            .post<TXSkeleton>('/txs/send', {
              ...data,
              ...(coin !== TRADE_TYPES.ETHEREUM ? { pubkeys: [pubKey] } : {}),
              signatures: [coin !== TRADE_TYPES.ETHEREUM ? `${signature}01` : signature],
            })
            .then(
              ({ data: { tx } }) => {
                return tx.hash;
              },
              e => {
                throw new UnableToReleaseCrypto(rawAddress, destination, coin, e);
              }
            );
        }
        throw new UnableToSignTransaction(rawAddress);
      },
      e => {
        throw new UnableToReleaseCrypto(rawAddress, destination, coin, e);
      }
    );
}
