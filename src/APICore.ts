import {backOff} from 'exponential-backoff';
import type {RequestInit, Response} from 'undici';
import {FetchError} from './errors/fetchError';
import {ThrottleError} from './errors/throttleError';
import {PlatformUrlOptions} from './environment';
export class APICore {
  public constructor(
    private accessToken: string,
    private options: Required<PlatformUrlOptions>
  ) {}

  private async request(url: string, config: RequestInit): Promise<Response> {
    const req = async () => {
      const response = await fetch(url, {
        ...config,
        headers: {...this.requestHeaders, ...config.headers},
      });
      await this.handleResponse(response);
      return response;
    };

    return backOff(req, {
      retry: (err: unknown) => err instanceof ThrottleError,
      jitter: 'full',
      timeMultiple: 1,
      startingDelay: this.options.retryAfter,
      numOfAttempts: Math.floor(
        this.options.ejectAfter / this.options.retryAfter
      ),
    });
  }

  private async handleResponse(response: Response) {
    if (response.ok) {
      return;
    }
    if (this.isThrottled(response)) {
      throw new ThrottleError();
    }
    throw await FetchError.build(response);
  }

  private async requestJson<T>(url: string, config: RequestInit): Promise<T> {
    return (await this.request(url, config)).json() as Promise<T>;
  }

  public async post<T>(url: string, data: unknown = {}): Promise<T> {
    return this.requestJson(url, {body: JSON.stringify(data), method: 'post'});
  }

  public async put<T>(url: string): Promise<T>;
  public async put<T>(url: string, data: unknown): Promise<T>;
  public async put<T>(url: string, data: unknown, parse: true): Promise<T>;
  public async put(url: string, data: unknown, parse: false): Promise<Response>;
  public async put<T>(url: string, data: unknown = {}, parse = true) {
    return this.selectRequester<T>(parse)(url, {
      body: JSON.stringify(data),
      method: 'put',
    });
  }

  private selectRequester<T>(parse: boolean) {
    return (parse ? this.requestJson<T> : this.request).bind(this);
  }

  public async delete<T>(url: string): Promise<T>;
  public async delete(url: string, parse: false): Promise<Response>;
  public async delete<T>(url: string, parse: true): Promise<T>;
  public async delete<T>(url: string, parse = true) {
    return this.selectRequester<T>(parse)(url, {method: 'delete'});
  }

  private get requestHeaders(): Record<string, string> {
    const authorizationHeader = {
      Authorization: `Bearer ${this.accessToken}`,
    };

    const documentsRequestHeaders = {
      ...authorizationHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    return documentsRequestHeaders;
  }

  private isThrottled(res: Response): boolean {
    return res.status === 429;
  }
}
