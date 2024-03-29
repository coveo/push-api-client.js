import PlatformClient, {FieldModel} from '@coveo/platform-client';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {ensureNecessaryCoveoPrivileges} from '../validation/preconditions/apiKeyPrivilege';
import {
  readFieldsPrivilege,
  writeFieldsPrivilege,
} from '../validation/preconditions/platformPrivilege';
import type {FieldAnalyserReport} from './fieldAnalyser';

const allowedCharRegExp = new RegExp('^[a-z]+[a-z0-9_]*$');

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

export const createFieldsFromReport = async (
  client: PlatformClient,
  report: FieldAnalyserReport
) => {
  {
    if (report.inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(report.inconsistencies);
    }
    await createFields(client, report.fields);
  }
};

export const isFieldNameValid = (fieldName: string): boolean => {
  return allowedCharRegExp.test(fieldName.toLowerCase());
};
