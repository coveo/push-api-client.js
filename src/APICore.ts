import {backOff} from 'exponential-backoff';
import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';

export class APICore {
  public constructor(private accessToken: string) {}

  private async request<T>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const req = async () => {
      const response = await axios.request<T>({
        ...config,
        ...this.axiosRequestHeaders,
      });

      if (this.isThrottled(response.status)) {
        throw response;
      }
      return response;
    };

    return backOff(req, {
      retry: (res: AxiosResponse<T>) => this.isThrottled(res.status),
    });
  }

  public async post<T>(
    url: string,
    data: unknown = {}
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({url, data, method: 'post'});
  }

  public async put<T>(
    url: string,
    data: unknown = {}
  ): Promise<AxiosResponse<T>> {
    return this.request({url, data, method: 'put'});
  }

  public async delete<T>(url: string): Promise<AxiosResponse<T>> {
    return this.request({url, method: 'delete'});
  }

  private get axiosRequestHeaders(): AxiosRequestConfig {
    const authorizationHeader = {
      Authorization: `Bearer ${this.accessToken}`,
    };

    const documentsRequestHeaders = {
      ...authorizationHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    return {headers: documentsRequestHeaders};
  }

  private isThrottled(status: number): boolean {
    return status === 429;
  }
}
