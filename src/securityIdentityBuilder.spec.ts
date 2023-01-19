import {
  GroupSecurityIdentityBuilder,
  VirtualGroupSecurityIdentityBuilder,
  UserSecurityIdentityBuilder,
} from './securityIdentityBuilder';

describe('SecurityIdentityBuilder', () => {
  describe('when instanciating a UserSecurityIdentityBuilder', () => {
    it('should not include undefined securityProvider', () => {
      const identity = new UserSecurityIdentityBuilder('foo@example.com');
      expect(identity.build()).toEqual({
        identity: 'foo@example.com',
        identityType: 'USER',
        securityProvider: 'Email Security Provider',
      });
    });

    it('should not use provided securityProvider', () => {
      const identity = new UserSecurityIdentityBuilder(
        'foo@example.com',
        'provider12345'
      );
      expect(identity.build()).toEqual({
        identity: 'foo@example.com',
        identityType: 'USER',
        securityProvider: 'provider12345',
      });
    });
  });

  describe.each([
    {identityBuilderClass: GroupSecurityIdentityBuilder, identityType: 'GROUP'},
    {
      identityBuilderClass: VirtualGroupSecurityIdentityBuilder,
      identityType: 'VIRTUAL_GROUP',
    },
  ])(
    'when instanciating a $identityBuilderClass.name',
    ({identityBuilderClass, identityType}) => {
      it('should not include undefined securityProvider', () => {
        const identity = new identityBuilderClass('SampleTeam');
        expect(identity.build()).toEqual({
          identity: 'SampleTeam',
          identityType,
        });
      });

      it('should include securityProvider in the identity', () => {
        const identity = new identityBuilderClass(
          'SampleTeam',
          'provider123456'
        );
        expect(identity.build()).toEqual({
          identity: 'SampleTeam',
          identityType,
          securityProvider: 'provider123456',
        });
      });
    }
  );
});
