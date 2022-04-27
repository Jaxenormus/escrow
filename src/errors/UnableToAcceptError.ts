export default class UnableToAcceptError extends Error {
  channelId: string;

  tradeId: number;

  constructor(channelId: string, tradeId: number, e: Error) {
    super(channelId);
    this.name = 'UnableToAcceptError';
    this.channelId = channelId;
    this.tradeId = tradeId;
    this.message = `Trade ${tradeId} in trade ${channelId} could not be accepted due to ${e.message}.`;
  }
}
