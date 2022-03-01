jest.mock('@coveord/platform-client');

import PlatformClient, {FieldTypes} from '@coveord/platform-client';
import {DocumentBuilder, Metadata} from '..';
import {InvalidPermanentId} from '../errors/fieldErrors';
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

  const mockListFieldsWithValidPermanentId = () => {
    mockedListFields
      .mockResolvedValueOnce({
        items: [
          {name: 'brand', type: FieldTypes.STRING},
          {name: 'category', type: FieldTypes.STRING},
          {name: 'permanentid', type: FieldTypes.STRING},
        ],
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [{name: 'type'}],
        totalPages: 2,
      });
  };

  const mockListFieldsWithInvalidPermanentId = () => {
    mockedListFields.mockResolvedValueOnce({
      items: [{name: 'permanentid', type: FieldTypes.DATE}],
      totalPages: 1,
    });
  };

  const mockListFieldsWithNoPermanentId = () => {
    mockedListFields.mockResolvedValueOnce({
      items: [],
      totalPages: 1,
    });
  };

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
  });

  beforeEach(() => {
    mockedListFields.mockReset();
    analyser = new FieldAnalyser(dummyPlatformClient());
  });

  describe('when fields from the batch already exist in the org', () => {
    let report: FieldAnalyserReport;
    beforeEach(async () => {
      mockListFieldsWithValidPermanentId();
      report = (await analyser.add([docWithExistingFields])).report();
    });

    afterEach(() => {});

    it('should not return fields to create', async () => {
      expect(report.fields).toStrictEqual([]);
    });

    it('should not detect inconsistencies', async () => {
      expect(report.inconsistencies.size).toStrictEqual(0);
    });
  });

  describe('when batch contain new fields', () => {
    beforeEach(() => {
      mockListFieldsWithValidPermanentId();
    });

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
      mockListFieldsWithValidPermanentId();
      report = (await analyser.add(docBuilders)).report();
    });

    it('should detect 2 inconsistencies', () => {
      expect(report.inconsistencies.size).toBe(2);
    });

    it('should detect type inconsistencies', () => {
      const inconsistenciesSet = report.inconsistencies;
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

  describe('when permanentId is not correctly configured', () => {
    beforeEach(() => {
      mockListFieldsWithInvalidPermanentId();
    });

    it('should throw an error', async () => {
      await analyser.add([docWithExistingFields]);
      expect(() => analyser.report()).toThrow(InvalidPermanentId);
    });
  });

  describe('when permanentId is missing from the organization', () => {
    beforeEach(() => {
      mockListFieldsWithNoPermanentId();
    });

    it('should include permanentid field in the analysis report', async () => {
      await analyser.add([docWithExistingFields]);
      const report = analyser.report();
      expect(report.fields).toContainEqual({
        name: 'permanentid',
        type: 'STRING',
      });
    });
  });

  it.todo('should create the missing fields');
});
