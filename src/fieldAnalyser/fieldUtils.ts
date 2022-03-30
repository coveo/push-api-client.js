import PlatformClient, {FieldModel} from '@coveord/platform-client';
import {ensureNecessaryCoveoPrivileges} from '../validation/preconditions/apiKeyPrivilege';
import {
  readFieldsPrivilege,
  writeFieldsPrivilege,
} from '../validation/preconditions/platformPrivilege';

export const listAllFieldsFromOrg = async (
  client: PlatformClient,
  page = 0,
  fields: FieldModel[] = []
): Promise<FieldModel[]> => {
  await ensureNecessaryCoveoPrivileges(client, readFieldsPrivilege);
  const list = await client.field.list({
    page,
    perPage: 1000,
  });

  fields.push(...list.items);

  if (page < list.totalPages - 1) {
    return listAllFieldsFromOrg(client, page + 1, fields);
  }

  return fields;
};

export const createFields = async (
  client: PlatformClient,
  fields: FieldModel[],
  fieldBatch = 500
) => {
  await ensureNecessaryCoveoPrivileges(client, writeFieldsPrivilege);
  for (let i = 0; i < fields.length; i += fieldBatch) {
    const batch = fields.slice(i, fieldBatch + i);
    await client.field.createFields(batch);
  }
};
