export default class UnableToSignTransaction extends Error {
  address: string;

  constructor(address: string) {
    super();
    this.name = 'UnableToSignTransaction';
    this.address = address;
    this.message = `Failed to sign the transaction for ${address}.`;
  }
}
