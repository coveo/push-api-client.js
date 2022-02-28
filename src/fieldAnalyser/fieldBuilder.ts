import {FieldModel, FieldTypes} from '@coveord/platform-client';
import performance from '../performances/performance';

export class FieldBuilder {
  public readonly dict: Record<string, FieldTypes> = {};

  constructor() {}
  public add(name: string, type: FieldTypes) {
    performance.inspect();
    this.dict[name] = type;
    return this;
  }

  public concat(fieldBuilder: FieldBuilder) {
    Object.entries(fieldBuilder.dict).map(([name, type]) => {
      this.dict[name] = type;
    });
    return this;
  }

  public marshal(): FieldModel[] {
    const fieldModels: FieldModel[] = [];
    Object.entries(this.dict).map(([fieldName, fieldType]) => {
      performance.inspect();
      fieldModels.push({
        name: fieldName,
        type: fieldType,
      });
    });
    performance.inspect();
    return fieldModels;
  }
}
