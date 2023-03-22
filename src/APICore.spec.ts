import type {Response} from 'undici';

jest.mock('./errors/fetchError');
import {FetchError} from './errors/fetchError';

import {APICore} from './APICore';

describe('APICore', () => {
  const mockedFetchJson = jest.fn();
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockedFetchJson),
    } as Response);
  });

  describe('when request is OK', () => {
    it('resolve with json', async () => {
      const apiCore = new APICore('suchsecret');
      await expect(apiCore.post('whatever')).resolves.toBe(mockedFetchJson);
    });
  });

  describe('when request is throttled', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve(mockedFetchJson),
      });
    });

    it('try again and then resolve with json', async () => {
      const apiCore = new APICore('suchsecret');
      await expect(apiCore.post('whatever')).resolves.toBe(mockedFetchJson);
      expect(fetchMock).toBeCalledTimes(2);
    });
  });

  describe('when request is NOK and not throttled', () => {
    let mockedFetchErrorBuild: jest.SpyInstance;
    const fakeFetchError = jest.fn();

    beforeEach(() => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve(mockedFetchJson),
      });
      mockedFetchErrorBuild = jest
        .spyOn(FetchError, 'build')
        .mockImplementationOnce(() =>
          Promise.resolve(fakeFetchError as unknown as FetchError)
        );
    });

    it('rejects a FetchError', async () => {
      const apiCore = new APICore('suchsecret');
      await expect(apiCore.post('whatever')).rejects.toBe(fakeFetchError);
      expect(fetchMock).toBeCalledTimes(1);
      expect(mockedFetchErrorBuild).toBeCalledTimes(1);
      expect(mockedFetchErrorBuild).toBeCalledWith(
        await fetchMock.mock.results[0].value
      );
    });
  });
});
