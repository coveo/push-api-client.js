import {FieldModel} from '@coveord/platform-client';

export class FieldStore extends Map<string, FieldModel> {
  public concat(fieldBuilder: FieldStore) {
    fieldBuilder.forEach((type, name) => {
      this.set(name, type);
    });
  }

  public marshal(): FieldModel[] {
    const fieldModels: FieldModel[] = [];
    this.forEach((model) => {
      fieldModels.push(model);
    });

    return fieldModels;
  }
}
