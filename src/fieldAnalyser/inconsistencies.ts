import {FieldTypes} from '@coveord/platform-client';

export class Inconsistencies extends Map {
  constructor() {
    super();
  }

  public add(fieldName: string, types: FieldTypes[]) {
    const fieldTypeSet = this.get(fieldName) || [];
    this.set(fieldName, new Set<FieldTypes>([...fieldTypeSet, ...types]));
    return this;
  }
}
