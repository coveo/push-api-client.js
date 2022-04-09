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

export function isMultiValueFacet(obj: unknown): boolean {
  // Handling the most obvious use case. A multi value field could also be a string with delimiter, but we do not want to assume anything...
  // With an array, we know for sure the metadata has multiple values
  return Array.isArray(obj);
}

export function isHierarchicalFacet(obj: unknown): boolean {
  // TODO: check if the array values follow a isHierarchy
  const isHierarchical = false;
  return isMultiValueFacet(obj) && isHierarchical;
}

export function getGuessedTypeFromValue(obj: unknown): FieldTypes {
  if (Array.isArray(obj) && obj.length > 0) {
    return getGuessedTypeFromValue(obj[0]); // FIXME: Not sure here. What should we use to define the type?
  }
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
