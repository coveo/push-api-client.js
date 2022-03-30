import type {PrivilegeModel} from '@coveord/platform-client';

export interface PlatformPrivilege {
  models: PrivilegeModel[];
  unsatisfiedConditionMessage: string;
}

export const readFieldsPrivilege: PlatformPrivilege = {
  models: [
    {
      type: 'VIEW',
      targetDomain: 'FIELD',
      targetId: '*',
      owner: 'PLATFORM',
    },
  ],
  unsatisfiedConditionMessage: `Your API key doesn't have the privilege to view fields and their configuration. Make sure to grant this privilege to your API key before running the command again.
  See https://docs.coveo.com/en/1707#fields-domain`,
};

export const writeFieldsPrivilege: PlatformPrivilege = {
  models: [
    ...readFieldsPrivilege.models,
    {
      type: 'CREATE',
      targetDomain: 'FIELD',
      targetId: '*',
      owner: 'PLATFORM',
    },
    {
      type: 'EDIT',
      targetDomain: 'FIELD',
      targetId: '*',
      owner: 'PLATFORM',
    },
  ],
  unsatisfiedConditionMessage: `Your API key doesn't have the privilege to create or update fields. Make sure to grant this privilege to your API key before running the command again.
  See https://docs.coveo.com/en/1707#fields-domain`,
};
