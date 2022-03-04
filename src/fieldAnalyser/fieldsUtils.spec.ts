jest.mock('@coveord/platform-client');

import PlatformClient, {FieldModel} from '@coveord/platform-client';
import {createFields, listAllFieldsFromOrg} from './fieldUtils';

const mockedPlatformClient = jest.mocked(PlatformClient);
const mockedCreateField = jest.fn();
const mockedListFields = jest.fn();

const dummyPlatformClient = (): PlatformClient => {
  return new PlatformClient({accessToken: 'xxx'});
};

const doMockPlatformClient = () => {
  mockedPlatformClient.mockImplementation(
    () =>
      ({
        field: {
          createFields: mockedCreateField,
          list: mockedListFields,
        },
      } as unknown as PlatformClient)
  );
};

describe('fieldUtils', () => {
  let client: PlatformClient;
  beforeAll(() => {
    doMockPlatformClient();
  });

  beforeEach(async () => {
    client = dummyPlatformClient();
  });

  describe('when listing fields', () => {
    beforeEach(async () => {
      mockedListFields
        .mockReturnValueOnce({
          items: [{name: 'brand'}, {name: 'category'}],
          totalPages: 2,
        })
        .mockReturnValueOnce({
          items: [{name: 'type'}],
          totalPages: 2,
        });
      await listAllFieldsFromOrg(client);
    });

    it('should list all fields from org', async () => {
      expect(mockedListFields).toHaveBeenCalledTimes(2);
    });
  });

  describe('when creating fields', () => {
    const fields: FieldModel[] = [
      {name: 'field1'},
      {name: 'field2'},
      {name: 'field3'},
      {name: 'field4'},
      {name: 'field5'},
      {name: 'field6'},
    ];

    it.each([
      {
        batchLimit: 4,
        batches: [
          ['field1', 'field2', 'field3', 'field4'],
          ['field5', 'field6'],
        ],
      },
      {
        batchLimit: 6,
        batches: [['field1', 'field2', 'field3', 'field4', 'field5', 'field6']],
      },
      {
        batchLimit: 999,
        batches: [['field1', 'field2', 'field3', 'field4', 'field5', 'field6']],
      },
    ])(
      'should split fields into smaller batches',
      async ({batchLimit, batches}) => {
        await createFields(client, fields, batchLimit);
        expect(mockedCreateField).toHaveBeenCalledTimes(batches.length);
        batches.forEach((batch, index) => {
          const field = batch.map((f) => ({
            name: f,
          }));
          expect(mockedCreateField).toHaveBeenNthCalledWith(index + 1, field);
        });
      }
    );
  });
});
