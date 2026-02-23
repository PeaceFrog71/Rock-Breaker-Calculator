/**
 * Client-side AES-GCM encryption for Regolith API keys stored in Supabase.
 *
 * The encryption key is derived using PBKDF2 from the user's ID and a static
 * salt (VITE_ENCRYPTION_SALT). This prevents PeaceFrog Gaming from reading
 * user API keys via the Supabase dashboard or database exports.
 *
 * Security model: protects against incidental access (dashboard browsing, DB
 * exports, Supabase staff). A determined attacker with both the Supabase dump
 * AND access to the deployed JS bundle could reconstruct the key. Appropriate
 * for a gaming tool API key where we want to avoid collecting user data.
 */

function getSalt(): string {
  return (import.meta.env.VITE_ENCRYPTION_SALT as string | undefined) ?? 'pfg-breakit-regolith-default';
}

async function deriveKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(getSalt()),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...bytes));
}

/** Returns Uint8Array<ArrayBuffer> — required by Web Crypto (no SharedArrayBuffer) */
function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Encrypt a plaintext string for storage in Supabase user_metadata.
 * Returns a "base64(iv).base64(ciphertext)" string.
 */
export async function encryptForSupabase(plaintext: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}

/**
 * Decrypt a ciphertext string retrieved from Supabase user_metadata.
 * Returns null on any failure — wrong key, corrupt data, or plain-text legacy value.
 */
export async function decryptFromSupabase(ciphertext: string, userId: string): Promise<string | null> {
  try {
    const parts = ciphertext.split('.');
    if (parts.length !== 2) return null;
    const iv = fromBase64(parts[0]);
    const encrypted = fromBase64(parts[1]);
    const key = await deriveKey(userId);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
