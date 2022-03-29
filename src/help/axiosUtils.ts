import type {AxiosRequestConfig} from 'axios';

export const axiosRequestHeaders = (apikey: string): AxiosRequestConfig => {
  const authorizationHeader = {
    Authorization: `Bearer ${apikey}`,
  };

  const documentsRequestHeaders = {
    ...authorizationHeader,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  return {headers: documentsRequestHeaders};
};
