import PlatformClient, {FieldModel} from '@coveord/platform-client';

export const listAllFieldsFromOrg = async (
  client: PlatformClient,
  page = 0,
  fields: FieldModel[] = []
): Promise<string[]> => {
  const list = await client.field.list({
    page,
    perPage: 1000,
  });

  fields.push(...list.items);

  if (page < list.totalPages - 1) {
    return listAllFieldsFromOrg(client, page + 1, fields);
  }

  return fields.map(({name}) => `${name}`);
};

export const createFields = async (
  client: PlatformClient,
  fields: FieldModel[],
  fieldBatch = 500
) => {
  if (fields.length === 0) {
    return;
  }
  for (let i = 0; i < fields.length; i += fieldBatch) {
    const batch = fields.slice(i, fieldBatch + i);
    await client.field.createFields(batch);
  }
};
