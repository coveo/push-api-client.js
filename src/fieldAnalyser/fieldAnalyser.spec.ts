jest.mock('@coveord/platform-client');

import PlatformClient from '@coveord/platform-client';
import {DocumentBuilder, Metadata} from '..';
import {FieldAnalyser, FieldAnalyserReport} from './fieldAnalyser';

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
    let report: FieldAnalyserReport;
    beforeEach(async () => {
      report = (await analyser.add([docWithExistingFields])).report();
    });

    it('should not return fields to create', async () => {
      expect(report.fields).toStrictEqual([]);
    });

    it('should not detect inconsistencies', async () => {
      expect(report.inconsistencies.count).toStrictEqual(0);
    });
  });

  describe('when batch contain new fields', () => {
    it('should return fields to create', async () => {
      const docBuilders = [docWithNewFields, docWithExistingFields];
      const {fields} = (await analyser.add(docBuilders)).report();
      expect(fields).toStrictEqual([
        {
          name: 'promo_price',
          type: 'DOUBLE',
        },
        {
          name: 'description',
          type: 'STRING',
        },
        {
          name: 'additional_info',
          type: 'STRING',
        },
        {
          name: 'price',
          type: 'STRING',
        },
        {
          name: 'available',
          type: 'STRING',
        },
      ]);
    });
  });

  describe('when the batch contains inconsistent metadata', () => {
    let report: FieldAnalyserReport;
    const docBuilders = [
      docWithNewFields,
      docWithExistingFields,
      buildDocument({price: 6.5, available: 0}),
      buildDocument({available: 1}),
    ];

    beforeEach(async () => {
      report = (await analyser.add(docBuilders)).report();
    });

    it('should detect 2 inconsistencies', () => {
      expect(report.inconsistencies.count).toBe(2);
    });

    it('should detect type inconsistencies', () => {
      const inconsistenciesSet = report.inconsistencies.get();
      expect(inconsistenciesSet.get('price')).toStrictEqual(
        new Set(['DOUBLE', 'STRING'])
      );
      expect(inconsistenciesSet.get('available')).toStrictEqual(
        new Set(['DOUBLE', 'STRING'])
      );
    });

    it('should still provide fields to create', () => {
      expect(report.fields).toStrictEqual([
        {
          name: 'promo_price',
          type: 'DOUBLE',
        },
        {
          name: 'description',
          type: 'STRING',
        },
        {
          name: 'additional_info',
          type: 'STRING',
        },
        {
          name: 'price',
          type: 'STRING',
        },
        {
          name: 'available',
          type: 'DOUBLE',
        },
      ]);
    });

    it('should associate to a field a type based on the type precedence list', () => {
      // In this scenario, there were equal amount of occurences of numeric string values for the same metadata
      expect(report.fields).toContainEqual({
        name: 'price',
        type: 'STRING',
      });
    });

    it('should associate to a field a type with the most occurences', () => {
      // In this scenario, there were 2 occurences of numeric value and 1 occurence of string value for the same metadata
      expect(report.fields).toContainEqual({
        name: 'available',
        type: 'DOUBLE',
      });
    });
  });

  it.todo('should create the missing fields');
});
