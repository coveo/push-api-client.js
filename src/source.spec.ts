/* eslint-disable node/no-unpublished-import */
jest.mock('@coveord/platform-client');
import mockAxios from 'jest-mock-axios';
import PlatformClient, {SourceVisibility} from '@coveord/platform-client';
import {Source} from './source';
import {mocked} from 'ts-jest/utils';
import {DocumentBuilder} from './documentBuilder';

const mockedPlatformClient = mocked(PlatformClient);
const mockCreate = jest.fn();
mockedPlatformClient.mockImplementation(
  () =>
    (({
      source: {
        create: mockCreate,
      },
    } as unknown) as PlatformClient)
);

describe('Source', () => {
  it('should call platform client on creation', () => {
    new Source('the_key', 'the_org').create(
      'the_name',
      SourceVisibility.SHARED
    );

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'the_name',
      pushEnabled: true,
      sourceType: 'PUSH',
      sourceVisibility: 'SHARED',
    });
  });

  it('should call axios on add document', () => {
    new Source('the_key', 'the_org').addOrUpdateDocument(
      'the_id',
      new DocumentBuilder('the_uri', 'the_title')
    );

    expect(mockAxios.put).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri',
      expect.stringContaining('the_title'),
      {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer the_key',
          'Content-Type': 'application/json',
        },
      }
    );
  });
});
