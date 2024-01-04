jest.mock('@coveo/platform-client');

import PlatformClient, {FieldModel, FieldTypes} from '@coveo/platform-client';
import {Inconsistencies} from './inconsistencies';
import {FieldTypeInconsistencyError} from '../errors';
import * as Utils from './fieldUtils';
const {createFields, listAllFieldsFromOrg, createFieldsFromReport} = Utils;

const mockedPlatformClient = jest.mocked(PlatformClient);
const mockedCreateField = jest.fn();
const mockedListFields = jest.fn();
const mockEvaluate = jest.fn();

const dummyPlatformClient = (): PlatformClient => {
  return new PlatformClient({accessToken: 'xxx'});
};

const doMockPlatformClient = () => {
  mockedPlatformClient.mockImplementation(
    () =>
      ({
        privilegeEvaluator: {evaluate: mockEvaluate},
        field: {
          createFields: mockedCreateField,
          list: mockedListFields,
        },
      }) as unknown as PlatformClient
  );
};

describe('fieldUtils', () => {
  let client: PlatformClient;
  beforeAll(() => {
    doMockPlatformClient();
  });

  beforeEach(async () => {
    client = dummyPlatformClient();
    mockEvaluate.mockResolvedValue({approved: true});
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

  describe('when creating fields from report', () => {
    const fields: FieldModel[] = [
      {name: 'field1'},
      {name: 'field2'},
      {name: 'field3'},
    ];

    it('should call #createFields', async () => {
      const spy = jest.spyOn(Utils, 'createFields');
      const inconsistencies = new Inconsistencies();
      await createFieldsFromReport(dummyPlatformClient(), {
        fields,
        inconsistencies,
      });
      expect(spy).toHaveBeenCalledWith(client, [
        {name: 'field1'},
        {name: 'field2'},
        {name: 'field3'},
      ]);
    });

    it('should throw if inconsistencies', async () => {
      const inconsistencies = new Inconsistencies();
      inconsistencies.add('foo', [FieldTypes.STRING, FieldTypes.DOUBLE]);
      const create = () =>
        createFieldsFromReport(dummyPlatformClient(), {
          fields,
          inconsistencies,
        });
      await expect(() => create()).rejects.toThrow(FieldTypeInconsistencyError);
    });
  });
});
