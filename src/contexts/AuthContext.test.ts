import { describe, it, expect } from 'vitest';
import {
  getRegolithApiKeySupabase,
  hasRegolithApiKeySupabase,
  getDisplayName,
  getAvatarUrl,
  getAvatarId,
  getCustomAvatarUrl,
} from './AuthContext';
import { encryptForSupabase } from '../utils/apiKeyCrypto';
import type { User } from '@supabase/supabase-js';

// Minimal User fixture — only the fields our helpers read
function makeUser(metadata: Record<string, unknown> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: metadata,
    app_metadata: {},
    aud: 'authenticated',
    created_at: '',
  } as unknown as User;
}

// ─── hasRegolithApiKeySupabase ────────────────────────────────────────────────

describe('hasRegolithApiKeySupabase', () => {
  it('returns false when user is null', () => {
    expect(hasRegolithApiKeySupabase(null)).toBe(false);
  });

  it('returns false when no regolith_api_key in metadata', () => {
    expect(hasRegolithApiKeySupabase(makeUser({ display_name: 'Drew' }))).toBe(false);
  });

  it('returns true when regolith_api_key is present', () => {
    expect(hasRegolithApiKeySupabase(makeUser({ regolith_api_key: 'some-ciphertext' }))).toBe(true);
  });

  it('returns false when regolith_api_key is explicitly null', () => {
    expect(hasRegolithApiKeySupabase(makeUser({ regolith_api_key: null }))).toBe(false);
  });
});

// ─── getRegolithApiKeySupabase ────────────────────────────────────────────────

describe('getRegolithApiKeySupabase', () => {
  it('returns null when user is null', async () => {
    expect(await getRegolithApiKeySupabase(null)).toBeNull();
  });

  it('returns null when no regolith_api_key in metadata', async () => {
    const user = makeUser({ display_name: 'Drew' });
    expect(await getRegolithApiKeySupabase(user)).toBeNull();
  });

  it('returns null when regolith_api_key is explicitly null', async () => {
    const user = makeUser({ regolith_api_key: null });
    expect(await getRegolithApiKeySupabase(user)).toBeNull();
  });

  it('decrypts and returns a previously encrypted key', async () => {
    const plaintext = 'my-regolith-key-abc123';
    const userId = 'user-123'; // matches makeUser id
    const encrypted = await encryptForSupabase(plaintext, userId);
    const user = makeUser({ regolith_api_key: encrypted });
    expect(await getRegolithApiKeySupabase(user)).toBe(plaintext);
  });

  it('returns null for malformed ciphertext (no dot separator)', async () => {
    const user = makeUser({ regolith_api_key: 'notvalidciphertext' });
    expect(await getRegolithApiKeySupabase(user)).toBeNull();
  });

  it('returns null when encrypted with a different userId (wrong key)', async () => {
    const encrypted = await encryptForSupabase('secret', 'different-user-id');
    const user = makeUser({ regolith_api_key: encrypted }); // user.id = 'user-123'
    expect(await getRegolithApiKeySupabase(user)).toBeNull();
  });
});

// ─── Existing helpers (smoke tests to catch regressions) ─────────────────────

describe('getDisplayName', () => {
  it('returns empty string for null user', () => {
    expect(getDisplayName(null)).toBe('');
  });

  it('prefers display_name', () => {
    expect(getDisplayName(makeUser({ display_name: 'Drew', full_name: 'Andrew' }))).toBe('Drew');
  });

  it('falls back to full_name when no display_name', () => {
    expect(getDisplayName(makeUser({ full_name: 'Andrew Norman' }))).toBe('Andrew Norman');
  });

  it('falls back to email prefix when no name metadata', () => {
    expect(getDisplayName(makeUser())).toBe('test');
  });
});

describe('getAvatarUrl', () => {
  it('returns null for null user', () => {
    expect(getAvatarUrl(null)).toBeNull();
  });

  it('returns avatar_url from metadata', () => {
    const user = makeUser({ avatar_url: 'https://example.com/avatar.png' });
    expect(getAvatarUrl(user)).toBe('https://example.com/avatar.png');
  });

  it('returns null when no avatar_url', () => {
    expect(getAvatarUrl(makeUser())).toBeNull();
  });
});

describe('getAvatarId', () => {
  it('returns null for null user', () => {
    expect(getAvatarId(null)).toBeNull();
  });

  it('returns avatar_id from metadata', () => {
    const user = makeUser({ avatar_id: 'prospector' });
    expect(getAvatarId(user)).toBe('prospector');
  });
});

describe('getCustomAvatarUrl', () => {
  it('returns null for null user', () => {
    expect(getCustomAvatarUrl(null)).toBeNull();
  });

  it('returns custom_avatar data URL from metadata', () => {
    const user = makeUser({ custom_avatar: 'data:image/png;base64,abc' });
    expect(getCustomAvatarUrl(user)).toBe('data:image/png;base64,abc');
  });
});
