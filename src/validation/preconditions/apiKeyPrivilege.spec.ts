jest.mock('@coveo/platform-client');

import PlatformClient from '@coveo/platform-client';
import {writeFieldsPrivilege} from './platformPrivilege';
import {ensureNecessaryCoveoPrivileges} from './apiKeyPrivilege';

const mockedPlatformClient = jest.mocked(PlatformClient);
const mockEvaluate = jest.fn();

const doMockPlatformClient = () => {
  mockedPlatformClient.mockImplementation(
    () =>
      ({
        privilegeEvaluator: {evaluate: mockEvaluate},
      }) as unknown as PlatformClient
  );
};

const dummyPlatformClient = (): PlatformClient => {
  return new PlatformClient({accessToken: 'xxx'});
};

describe('ApiKeyPrivileges', () => {
  let client: PlatformClient;
  beforeAll(() => {
    doMockPlatformClient();
  });

  beforeEach(async () => {
    client = dummyPlatformClient();
  });

  describe('when not missing privileges', () => {
    beforeEach(async () => {
      mockEvaluate.mockResolvedValue({approved: true});
    });

    it('should call the privilege evaluator for each privilege to evaluate', async () => {
      await ensureNecessaryCoveoPrivileges(client, writeFieldsPrivilege);
      expect(mockEvaluate).toHaveBeenCalledTimes(3);
    });

    it.each([
      {
        type: 'VIEW',
      },
      {
        type: 'CREATE',
      },
      {
        type: 'EDIT',
      },
    ])('should evaluate the "$type FIELD" privilege', async ({type}) => {
      await ensureNecessaryCoveoPrivileges(client, writeFieldsPrivilege);
      expect(mockEvaluate).toHaveBeenCalledWith({
        requestedPrivilege: {
          type,
          targetDomain: 'FIELD',
          targetId: '*',
          owner: 'PLATFORM',
        },
      });
    });

    it('should not throw a Privilege Error', async () => {
      await expect(
        ensureNecessaryCoveoPrivileges(client, writeFieldsPrivilege)
      ).resolves.not.toThrow();
    });
  });

  describe('when missing privileges', () => {
    beforeEach(async () => {
      mockEvaluate.mockResolvedValue({approved: false});
    });

    it('should throw a Privilege Error', async () => {
      await expect(
        ensureNecessaryCoveoPrivileges(client, writeFieldsPrivilege)
      ).rejects.toThrow(
        /Your API key doesn't have the privilege to create or update fields/
      );
    });
  });
});
