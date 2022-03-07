import {FieldTypes} from '@coveord/platform-client';

const acceptedTransitions: Array<{from: FieldTypes; to: Array<FieldTypes>}> = [
  {from: FieldTypes.LONG, to: [FieldTypes.LONG_64, FieldTypes.DOUBLE]},
  {from: FieldTypes.LONG_64, to: [FieldTypes.DOUBLE]},
];

export function isValidTypeTransition(
  currentState: FieldTypes,
  nextState: FieldTypes
): boolean {
  const sameStateTransition = currentState === nextState;
  const differentStateTransition = acceptedTransitions
    .find((a) => a.from === currentState)
    ?.to.includes(nextState);
  return sameStateTransition || Boolean(differentStateTransition);
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
  const isInteger = (x: number): boolean => Math.floor(x) === x;
  const is32BitInteger = (x: number) => (x | 0) === x;

  if (isInteger(number)) {
    return is32BitInteger(number) ? FieldTypes.LONG : FieldTypes.LONG_64;
  } else {
    return FieldTypes.DOUBLE;
  }
}
