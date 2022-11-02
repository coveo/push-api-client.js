import {FieldTypes} from '@coveo/platform-client';

const acceptedNumericalTypeEvolutions = [
  FieldTypes.LONG,
  FieldTypes.LONG_64,
  FieldTypes.DOUBLE,
];

const acceptedAllTypeEvolutions = [
  ...acceptedNumericalTypeEvolutions,
  FieldTypes.STRING,
];

export function getMostEnglobingType(
  possibleType1: FieldTypes,
  possibleType2: FieldTypes,
  acceptedTypeEvolution = acceptedNumericalTypeEvolutions
): FieldTypes | null {
  if (possibleType1 === possibleType2) {
    return possibleType1;
  }

  if (
    acceptedTypeEvolution.includes(possibleType1) &&
    acceptedTypeEvolution.includes(possibleType2)
  ) {
    const idx1 = acceptedTypeEvolution.indexOf(possibleType1);
    const idx2 = acceptedTypeEvolution.indexOf(possibleType2);
    return acceptedTypeEvolution[Math.max(idx1, idx2)];
  }
  return null;
}

export function getGuessedTypeFromValue(obj: unknown): FieldTypes {
  if (typeof obj === 'object') {
    return getGuessedTypeFromObject(obj);
  }
  return getGuessedTypeFromPrimitive(obj);
}

function getGuessedTypeFromPrimitive(obj: unknown): FieldTypes {
  switch (typeof obj) {
    case 'number':
      return getSpecificNumericType(obj);
    case 'string':
      return FieldTypes.STRING;
    default:
      return FieldTypes.STRING;
  }
}

function getGuessedTypeFromObject(obj: null | Object): FieldTypes {
  const initialType = acceptedAllTypeEvolutions[0];
  const fallbackType = FieldTypes.STRING;

  if (obj === null) {
    return fallbackType;
  }
  const array = Array.isArray(obj) ? obj : Object.values(obj);
  return (
    array.reduce(
      (previous: FieldTypes, current: unknown) =>
        getMostEnglobingType(
          previous,
          getGuessedTypeFromPrimitive(current),
          acceptedAllTypeEvolutions
        ),
      initialType
    ) || fallbackType
  );
}

function getSpecificNumericType(number: number): FieldTypes {
  const is32BitInteger = (x: number) => (x | 0) === x;

  if (Number.isInteger(number)) {
    return is32BitInteger(number) ? FieldTypes.LONG : FieldTypes.LONG_64;
  } else {
    return FieldTypes.DOUBLE;
  }
}
