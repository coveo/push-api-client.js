import {Region} from '@coveord/platform-client';
import {PlatformEnvironment} from '../environment';
import {PushUrlBuilder, StreamUrlBuilder} from './urlUtils';

const platformOptions = {
  region: Region.US,
  environment: PlatformEnvironment.Prod,
};
describe('UrlBuilder', () => {
  describe('PushUrlBuilder', () => {
    let builder: PushUrlBuilder;

    beforeEach(() => {
      builder = new PushUrlBuilder('my-source-id', 'org-id', platformOptions);
    });

    it('should return the base url', () => {
      expect(builder.baseURL.toString()).toMatchSnapshot();
    });

    it('should return the base url for update', () => {
      expect(builder.baseAPIURLForUpdate.toString()).toMatchSnapshot();
    });

    it('should return the file container url', () => {
      expect(builder.fileContainerUrl.toString()).toMatchSnapshot();
    });
  });

  describe('StreamUrlBuilder', () => {
    let builder: StreamUrlBuilder;

    beforeEach(() => {
      builder = new StreamUrlBuilder('my-source-id', 'org-id', platformOptions);
    });

    it('should return the base url', () => {
      expect(builder.baseStreamURL.toString()).toMatchSnapshot();
    });

    it('should return the base url for update', () => {
      expect(builder.baseAPIURLForUpdate.toString()).toMatchSnapshot();
    });

    it('should return the file container url', () => {
      expect(builder.fileContainerUrl.toString()).toMatchSnapshot();
    });
  });
});
