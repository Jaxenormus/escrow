import { AxiosError } from 'axios';
import { get, values } from 'lodash';

import { TRADE_TYPES } from '@/context';

import BlockCypherError from './BlockCypherError';

export default class UnableToReleaseCrypto extends BlockCypherError {
  address: string;

  destination: string;

  coin: TRADE_TYPES;

  errors: string[];

  constructor(address: string, destination: string, coin: TRADE_TYPES, raw: AxiosError) {
    super(raw);
    this.name = 'UnableToReleaseCrypto';
    this.address = address;
    this.destination = destination;
    this.coin = coin;
    this.message = `Failed to release ${coin} from ${address} to ${destination}.`;

    if (raw && raw.response && raw.response.data) {
      this.errors = get(raw.response.data, 'errors', []).map(error => values(error)[0]);
    }
  }
}
