export default class ThumbnailFetchError extends Error {
  assetId: number;

  constructor() {
    super();
    this.name = 'ThumbnailFetchError';
    this.message = `Failed to fetch thumbnail for trade assets.`;
  }
}
