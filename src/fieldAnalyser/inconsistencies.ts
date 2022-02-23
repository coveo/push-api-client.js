import {FieldTypes} from '@coveord/platform-client';

export class Inconsistencies {
  private inconsitencies = new Map<string, Set<FieldTypes>>();

  public add(fieldName: string, types: FieldTypes[]) {
    const fieldTypeSet = this.inconsitencies.get(fieldName) || [];
    this.inconsitencies.set(
      fieldName,
      new Set<FieldTypes>([...fieldTypeSet, ...types])
    );
    return this;
  }

  public get count(): number {
    return this.inconsitencies.size;
  }

  public get(key: string) {
    return this.inconsitencies.get(key);
  }

  public forEach(
    callbackfn: (
      value: Set<FieldTypes>,
      key: string,
      map: Map<string, Set<FieldTypes>>
    ) => void,
    thisArg?: unknown
  ) {
    return this.inconsitencies.forEach(callbackfn, thisArg);
  }
}
