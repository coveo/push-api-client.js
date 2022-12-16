import {PrimitivesValues} from '@coveo/bueno';
import {join} from 'path';
import {DocumentBuilder} from '..';
import {CaseInsensitiveDocument} from './caseInsensitiveDocument';
import {processPermissionList} from './parsePermissions';

describe('parsePermissions', () => {
  let documentBuilder: DocumentBuilder;
  const dummyPath = join('dummy', 'path');
  const publicPermissionsSet = {
    allowAnonymous: true,
    deniedpermissions: [
      {
        identity: 'foo@example.com',
        identityType: 'USER',
      },
    ],
  };
  const restrictedPermissionSet = {
    allowAnonymous: false,
    ALLOWEDPERMISSIONS: [
      {
        identity: 'asmith@example.com',
        identityType: 'USER',
      },
      {
        identity: 'bjones@example.com',
        identityType: 'USER',
      },
    ],
  };

  const complexPermissionSet = {
    aLLowAnonyMOUS: false,
    deniedpermissions: [
      {
        identity: 'foo',
        identityType: 'VIRTUAL_GROUP',
      },
    ],
    allowedPERMISSIONS: [
      {
        identity: 'Sample_group',
        identityType: 'GROUP',
      },
      {
        identity: 'bjones@example.com',
        identityType: 'USER',
      },
    ],
  };

  beforeEach(() => {
    documentBuilder = new DocumentBuilder('https://foo.com', 'Some Document');
  });

  it('should not marhsal empty permssion when is empty array', () => {
    const caseInsensitiveDoc = new CaseInsensitiveDocument<PrimitivesValues>({
      permissions: [],
    });
    processPermissionList(caseInsensitiveDoc, documentBuilder, dummyPath);
    expect(documentBuilder.marshal()).not.toHaveProperty('permissions');
  });

  it('should marhsal denied permssion set', () => {
    const caseInsensitiveDoc = new CaseInsensitiveDocument<PrimitivesValues>({
      permissions: [publicPermissionsSet],
    });
    processPermissionList(caseInsensitiveDoc, documentBuilder, dummyPath);
    expect(documentBuilder.marshal().permissions).toMatchSnapshot();
  });

  it('should marhsal allowed permssion set', () => {
    const caseInsensitiveDoc = new CaseInsensitiveDocument<PrimitivesValues>({
      permissions: [restrictedPermissionSet],
    });
    processPermissionList(caseInsensitiveDoc, documentBuilder, dummyPath);
    expect(documentBuilder.marshal().permissions).toMatchSnapshot();
  });

  it('should marhsal combined permssion sets', () => {
    const caseInsensitiveDoc = new CaseInsensitiveDocument<PrimitivesValues>({
      permissions: [
        publicPermissionsSet,
        restrictedPermissionSet,
        complexPermissionSet,
      ],
    });
    processPermissionList(caseInsensitiveDoc, documentBuilder, dummyPath);
    expect(documentBuilder.marshal().permissions).toMatchSnapshot();
  });
});
