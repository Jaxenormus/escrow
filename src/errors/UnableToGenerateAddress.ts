import { AxiosError } from 'axios';
import { get, values } from 'lodash';

import { TRADE_TYPES } from '@/context';

import BlockCypherError from './BlockCypherError';

export default class UnableToGenerateAddress extends BlockCypherError {
  coin: TRADE_TYPES;

  errors: string[];

  constructor(coin: TRADE_TYPES, raw: AxiosError) {
    super(raw);
    this.name = 'UnableToGenerateAddress';

    this.coin = coin;
    this.message = `Failed to generate a new ${coin} address`;

    if (raw && raw.response && raw.response.data) {
      this.errors = get(raw.response.data, 'errors', []).map(error => values(error)[0]);
    }
  }
}
