declare module "satoshi-bitcoin" {
  export function toBitcoin(satoshis: number | string): number;
  export function toSatoshi(bitcoin: number | string): number;
}
