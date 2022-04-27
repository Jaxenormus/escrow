import { AxiosError } from 'axios';

export default class AxiosBasedError extends Error {
  raw: AxiosError;

  constructor(raw: AxiosError) {
    super();
    this.name = 'AxiosBasedError';
    this.raw = raw;
    if (this.raw) {
      this.message = this.raw.message;
    }
  }
}
