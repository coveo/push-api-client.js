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

  public get() {
    return this.inconsitencies;
  }

  public display(): void {
    // TODO: rename
    this.inconsitencies.forEach((typeSet, field) => {
      const inconsistentTypes = [];
      for (const type of typeSet) {
        inconsistentTypes.push(type);
      }
      console.log(
        `Inconsistency detected with the metadata "${field}". Possible types are: ${inconsistentTypes
          .sort()
          .join(', ')}`
      );
    });
  }
}
