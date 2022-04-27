export type CryptoDealAmount = {
  raw_crypto: number;
  crypto: string;
  raw_fiat: number;
  fiat: string;
};

export type DealConfirmationVerdict = 'RESTART' | 'RETURN' | 'CANCEL' | 'RELEASE';
