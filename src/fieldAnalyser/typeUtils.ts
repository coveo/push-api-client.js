import {FieldTypes} from '@coveord/platform-client';

const acceptedTransitions: Array<{from: FieldTypes; to: Array<FieldTypes>}> = [
  {from: FieldTypes.LONG, to: [FieldTypes.LONG_64, FieldTypes.DOUBLE]},
  {from: FieldTypes.LONG_64, to: [FieldTypes.DOUBLE]},
];

export function isValidTypeTransition(
  currentState: FieldTypes,
  nextState: FieldTypes
): boolean {
  if (currentState === nextState) {
    return true;
  }
  const differentStateTransition = acceptedTransitions
    .find((a) => a.from === currentState)
    ?.to.includes(nextState);
  return Boolean(differentStateTransition);
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