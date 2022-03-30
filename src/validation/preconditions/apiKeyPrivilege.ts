import type {PlatformPrivilege} from './platformPrivilege';
import type {
  PrivilegeEvaluatorModel,
  PrivilegeModel,
} from '@coveord/platform-client';
import PlatformClient from '@coveord/platform-client';
import {PrivilegeError} from '../../errors/privilegeError';

export async function ensureNecessaryCoveoPrivileges(
  client: PlatformClient,
  ...privileges: PlatformPrivilege[]
): Promise<void | never> {
  const promises = privileges.flatMap((privilege) =>
    privilege.models.map(async (model) => {
      if (!(await hasPrivilege(client, model))) {
        const message = privilege.unsatisfiedConditionMessage;
        throw new PrivilegeError(message);
      }
    })
  );

  await Promise.all(promises);
}

async function hasPrivilege(client: PlatformClient, privilege: PrivilegeModel) {
  const model: PrivilegeEvaluatorModel = {
    ...{requestedPrivilege: privilege},
  };

  const validation = await client.privilegeEvaluator.evaluate(model);
  return Boolean(validation.approved);
}
