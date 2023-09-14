import {Options} from '..';
import {platformUrl} from '../environment';

export interface URLBuilder {
  baseAPIURLForUpdate: URL;
  fileContainerUrl: URL;
}

abstract class BaseUrlBuilder {
  protected constructor(
    private organizationId: string,
    private options: Required<Options>
  ) {}
  protected get platformURL() {
    return `${platformUrl(this.options)}/${this.organizationId}`;
  }
  public get fileContainerUrl() {
    return new URL(`${this.platformURL}/files`);
  }
  public abstract get baseAPIURLForUpdate(): URL;
}

export class PushUrlBuilder extends BaseUrlBuilder implements URLBuilder {
  public constructor(
    private sourceId: string,
    organizationId: string,
    options: Required<Options>
  ) {
    super(organizationId, options);
  }
  public get baseURL() {
    return new URL(`${this.platformURL}/sources/${this.sourceId}`);
  }
  public get baseAPIURLForUpdate() {
    return new URL(`${this.baseURL}/documents/batch`);
  }
}

export class StreamUrlBuilder extends BaseUrlBuilder implements URLBuilder {
  public constructor(
    private sourceId: string,
    organizationId: string,
    options: Required<Options>
  ) {
    super(organizationId, options);
  }
  public get baseStreamURL() {
    return new URL(`${this.platformURL}/sources/${this.sourceId}/stream`);
  }
  public get baseAPIURLForUpdate() {
    return new URL(`${this.baseStreamURL}/update`);
  }
}
