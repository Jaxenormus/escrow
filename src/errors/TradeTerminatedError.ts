export default class TradeTerminatedError extends Error {
  channelId: string;

  userId: string;

  constructor(channelId: string, userId: string) {
    super(channelId);
    this.name = 'TradeTerminatedError';
    this.channelId = channelId;
    this.userId = userId;
    this.message = `Trade ${channelId} has been terminated by ${userId}.`;
  }
}
