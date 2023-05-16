import {z} from 'zod';

function objectKeysToLowerCase(arg: unknown): unknown {
  if (arg === null || typeof arg !== 'object') {
    return arg;
  }

  if (Array.isArray(arg)) {
    return arg.map(objectKeysToLowerCase);
  }

  return Object.fromEntries(
    Object.entries(arg).map(([key, value]) => [key.toLowerCase(), value])
  );
}

function stringToLowerCase(arg: unknown) {
  if (typeof arg === 'string') {
    return arg.toLowerCase();
  }
  return arg;
}

export const permissionIdentityModelScheme = z.preprocess(
  objectKeysToLowerCase,
  z.object({
    additionalinfo: z.string().optional(),
    identity: z.string(),
    identitytype: z.preprocess(
      stringToLowerCase,
      z.enum(['unknown', 'user', 'group', 'virtualgroup'])
    ),
    securityprovider: z.string().optional(),
  })
);

export const permissionSetScheme = z.preprocess(
  objectKeysToLowerCase,
  z.object({
    allowanonymous: z.boolean().optional(),
    allowedpermissions: z.array(permissionIdentityModelScheme).optional(),
    deniedpermissions: z.array(permissionIdentityModelScheme).optional(),
    name: z.string().optional(),
  })
);

export const permissionLevelScheme = z.preprocess(
  objectKeysToLowerCase,
  z.object({
    name: z.string(), // TODO: not sure this should be optional
    permissionsets: z.array(permissionSetScheme),
  })
);

export const permissionsScheme = z.union([
  z.array(permissionLevelScheme),
  z.array(permissionSetScheme),
]);
