export default class EarlyTerminationError extends Error {
  channelId: string;

  constructor(channelId: string) {
    super(channelId);
    this.name = 'EarlyTerminationError';
    this.channelId = channelId;
    this.message = `Trade ${channelId} has been terminated midway.`;
  }
}
