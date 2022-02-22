export abstract class PushApiClientBaseError extends Error {
  public name = 'Push API Client Error';
  public constructor(message?: string) {
    super(message);
  }
}
