export class ExpectedExecutionError {
  constructor(readonly _tag: string, readonly title: string, readonly message: string, readonly error: unknown) {
    this._tag = _tag;
    this.title = title;
    this.message = message;
    this.error = error;
  }
}
