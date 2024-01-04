import {PushApiClientBaseError} from './baseError';
import dedent from 'ts-dedent';

export class FetchError extends PushApiClientBaseError {
  public name = 'Fetch Error';
  public static async build(response: Response) {
    let body: string;
    try {
      body = JSON.stringify(await response.json());
    } catch (error) {
      body = await response.text();
    }
    return new FetchError(body);
  }
  private constructor(public body: string) {
    super();
    this.message = dedent`
      Response body:
      ${body}
    `;
  }
}
