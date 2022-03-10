export const axiosRequestHeaders = (apikey: string) => {
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
