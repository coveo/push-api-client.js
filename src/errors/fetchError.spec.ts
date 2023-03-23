import type {Response} from 'undici';
import {PushApiClientBaseError} from './baseError';
import {FetchError} from './fetchError';

describe('FetchError', () => {
  const fakeResponseJson = jest.fn();
  const fakeResponseText = jest.fn();
  const fakeResponse: Response = {
    json: fakeResponseJson,
    text: fakeResponseText,
  } as unknown as Response;

  beforeEach(() => {
    jest.resetAllMocks();
    fakeResponseJson.mockResolvedValue(null);
    fakeResponseText.mockResolvedValue('hello there');
  });

  it('has a proper name', async () => {
    expect((await FetchError.build(fakeResponse)).name).toBe('Fetch Error');
  });

  it('inherit the PushApiClientBaseError', async () => {
    expect(await FetchError.build(fakeResponse)).toBeInstanceOf(
      PushApiClientBaseError
    );
  });

  describe('when json returns a stringifiable object', () => {
    beforeEach(() => {
      fakeResponseJson.mockResolvedValueOnce({hello: 'world'});
    });

    it('uses its stringify value in the message', async () => {
      expect((await FetchError.build(fakeResponse)).message).toMatchSnapshot();
    });
  });

  describe('when json returns a unstringifiable object', () => {
    beforeEach(() => {
      const cyclicObject: {self?: object} = {};
      cyclicObject.self = cyclicObject;
      fakeResponseJson.mockResolvedValueOnce(cyclicObject);
    });

    it('uses the text value in the message', async () => {
      expect((await FetchError.build(fakeResponse)).message).toMatchSnapshot();
    });
  });

  describe('when json and text fails', () => {
    beforeEach(() => {
      fakeResponseJson.mockRejectedValueOnce('nope');
      fakeResponseText.mockRejectedValueOnce('nope');
    });

    it('does not returns a FetchError', async () => {
      await expect(FetchError.build(fakeResponse)).rejects.not.toBeInstanceOf(
        FetchError
      );
    });
  });
});
