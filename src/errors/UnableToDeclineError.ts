export default class UnableToDeclineError extends Error {
  channelId: string;

  tradeId: number;

  constructor(channelId: string, tradeId: number) {
    super(channelId);
    this.name = 'UnableToDeclineError';
    this.channelId = channelId;
    this.tradeId = tradeId;
    this.message = `Trade ${tradeId} in trade ${channelId} could not be declined.`;
  }
}
