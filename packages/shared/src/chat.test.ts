import { ChatScope, UserRole } from './enums';
import { changeUserRoleSchema, sendChatMessageSchema } from './schemas';

describe('chat schemas', () => {
  it('accepte un message global sans destinataire', () => {
    expect(
      sendChatMessageSchema.parse({ scope: ChatScope.GLOBAL, content: 'Signal reçu.' }),
    ).toEqual({ scope: ChatScope.GLOBAL, content: 'Signal reçu.' });
  });

  it('exige un destinataire pour un message privé', () => {
    expect(() =>
      sendChatMessageSchema.parse({ scope: ChatScope.PRIVATE, content: 'Transmission.' }),
    ).toThrow('Un destinataire est requis.');
  });

  it('refuse un destinataire sur un canal public', () => {
    expect(() =>
      sendChatMessageSchema.parse({
        scope: ChatScope.ALLIANCE,
        content: 'Transmission.',
        recipientId: '7d700b90-f14c-4a9e-8c2f-f05e632dcbb7',
      }),
    ).toThrow('Le destinataire est réservé aux messages privés.');
  });
});

describe('moderation schemas', () => {
  it('n’autorise pas la promotion directe en administrateur', () => {
    expect(changeUserRoleSchema.safeParse({ role: UserRole.ADMIN }).success).toBe(false);
    expect(changeUserRoleSchema.safeParse({ role: UserRole.MODERATOR }).success).toBe(true);
  });
});
