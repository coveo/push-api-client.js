jest.mock('@coveord/platform-client');

import PlatformClient from '@coveord/platform-client';
import {BatchUpdateDocuments, DocumentBuilder, Metadata} from '..';
import {FieldAnalyser} from './fieldAnalyser';

const buildDocument = (metadata?: Metadata) => {
  const doc = new DocumentBuilder('https://my.document.uri', 'some title');
  if (metadata) {
    doc.withMetadata(metadata);
  }
  return doc;
};

const docWithNewFields = buildDocument({
  promo_price: 23.13,
  description:
    'Plumbus can generate and store vast amounts of heat, allowing it to be used for cooking, ironing or just heating the room.',
  additional_info:
    'Plumbus can secrete various agents from itself and has adaptive rubbing surfaces, making it useful for cleaning.',
  price: 'six-and-a-half Brapples',
  category: 'Various',
  available: true,
});

const docWithExistingFields = buildDocument({
  type: 'Teleportation Device',
  category: 'Electronics',
})
  .withAuthor('Rick')
  .withFileExtension('.pewpew');

const dummyPlatformClient = (): PlatformClient => {
  return new PlatformClient({accessToken: 'xxx'});
};

describe('FieldAnalyser', () => {
  let analyser: FieldAnalyser;
  const mockedPlatformClient = jest.mocked(PlatformClient);
  const mockedListFields = jest.fn();

  const doMockPlatformClient = () => {
    mockedPlatformClient.mockImplementation(
      () =>
        ({
          field: {list: mockedListFields},
        } as unknown as PlatformClient)
    );
  };

  beforeAll(() => {
    doMockPlatformClient();
    analyser = new FieldAnalyser(dummyPlatformClient());
  });

  beforeEach(() => {
    mockedListFields
      .mockReturnValueOnce({
        items: [{name: 'brand'}, {name: 'category'}],
        totalPages: 2,
      })
      .mockReturnValueOnce({
        items: [{name: 'type'}],
        totalPages: 2,
      });
  });

  describe('when fields from the batch already exist in the org', () => {
    const batch: BatchUpdateDocuments = {
      addOrUpdate: [docWithExistingFields],
      delete: [],
    };

    it('should not return fields to create', async () => {
      const missingFields = await analyser.getFieldsToCreate(batch);
      expect(missingFields.fields).toStrictEqual({});
    });

    it('should not detect inconsistencies', async () => {
      const missingFields = await analyser.getFieldsToCreate(batch);
      expect(missingFields.inconsistencies.size).toStrictEqual(0);
    });
  });

  describe('when batch contain new fields', () => {
    const batch: BatchUpdateDocuments = {
      addOrUpdate: [docWithNewFields, docWithExistingFields],
      delete: [],
    };

    it('should return fields to create', async () => {
      const missingFields = (await analyser.getFieldsToCreate(batch)).fields;
      expect(missingFields).toStrictEqual({
        promo_price: 'DOUBLE',
        description: 'STRING',
        additional_info: 'STRING',
        price: 'STRING',
        available: 'STRING',
      });
    });
  });

  describe('when the batch contains inconsistent metadata', () => {
    let missingFields: Awaited<ReturnType<FieldAnalyser['getFieldsToCreate']>>;
    const batch: BatchUpdateDocuments = {
      addOrUpdate: [
        docWithNewFields,
        docWithExistingFields,
        buildDocument({price: 6.5, available: 0}),
        buildDocument({available: 1}),
      ],
      delete: [],
    };

    beforeEach(async () => {
      missingFields = await analyser.getFieldsToCreate(batch);
    });

    it('should detect type inconsistencies', () => {
      const inconsistenciesSet = missingFields.inconsistencies;
      expect(inconsistenciesSet.get('price')).toStrictEqual(
        new Set(['DOUBLE', 'STRING'])
      );
      expect(inconsistenciesSet.get('available')).toStrictEqual(
        new Set(['DOUBLE', 'STRING'])
      );
    });

    it('should still provide fields to create', () => {
      expect(Object.keys(missingFields.fields)).toStrictEqual([
        'promo_price',
        'description',
        'additional_info',
        'price',
        'available',
      ]);
    });

    it('should associate to a field a type based on the type precedence list', () => {
      // In this scenario, there were equal amount of occurences of numeric string values for the same metadata
      expect(missingFields.fields).toStrictEqual(
        expect.objectContaining({
          price: 'STRING',
        })
      );
    });

    it('should associate to a field a type with the most occurences', () => {
      // In this scenario, there were 2 occurences of numeric value and 1 occurence of string value for the same metadata
      expect(missingFields.fields).toStrictEqual(
        expect.objectContaining({
          available: 'DOUBLE',
        })
      );
    });
  });

  it.todo('should create the missing fields');
});
