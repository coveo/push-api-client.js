import {FieldTypes} from '@coveord/platform-client';

const acceptedTypeEvolutions = [
  [FieldTypes.LONG, FieldTypes.LONG_64, FieldTypes.DOUBLE],
];

export function getMostEnglobingType(
  possibleType1: FieldTypes,
  possibleType2: FieldTypes
): FieldTypes | null {
  if (possibleType1 === possibleType2) {
    return possibleType1;
  }

  for (const acceptedTypeEvolution of acceptedTypeEvolutions) {
    if (
      acceptedTypeEvolution.includes(possibleType1) &&
      acceptedTypeEvolution.includes(possibleType2)
    ) {
      const idx1 = acceptedTypeEvolution.indexOf(possibleType1);
      const idx2 = acceptedTypeEvolution.indexOf(possibleType2);
      return acceptedTypeEvolution[Math.max(idx1, idx2)];
    }
  }
  return null;
}

export function getGuessedTypeFromValue(obj: unknown): FieldTypes {
  switch (typeof obj) {
    case 'number':
      return getSpecificNumericType(obj);
    case 'string':
      return FieldTypes.STRING;
    default:
      return FieldTypes.STRING;
  }
}

function getSpecificNumericType(number: number): FieldTypes {
  const is32BitInteger = (x: number) => (x | 0) === x;

  if (Number.isInteger(number)) {
    return is32BitInteger(number) ? FieldTypes.LONG : FieldTypes.LONG_64;
  } else {
    return FieldTypes.DOUBLE;
  }
}
