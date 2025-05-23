import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm'; // Using GCM for authenticated encryption
const IV_LENGTH = 16; // GCM recommended IV length is 12, but 16 is also common and fine. Node default is 12 for GCM. Let's use 12 for GCM.
const GCM_IV_LENGTH = 12; 
const AUTH_TAG_LENGTH = 16; // GCM produces a 16-byte auth tag by default

const ENCRYPTION_KEY = process.env.EXCHANGE_API_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) { // Key should be 32 bytes, hex encoded means 64 chars
  console.error(
    'CRITICAL: EXCHANGE_API_ENCRYPTION_KEY environment variable is missing or not the correct length (must be 32 bytes, hex encoded to 64 characters for AES-256).'
  );
  // In a real app, you might want to throw an error here to prevent startup if the key is missing
  // For this context, we'll let it proceed but log the critical error. Operations will fail.
}

const key = ENCRYPTION_KEY ? Buffer.from(ENCRYPTION_KEY, 'hex') : Buffer.alloc(32); // Use a dummy key if not set, to avoid crashing, but operations will be insecure/fail

export function encrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('Encryption cannot proceed: EXCHANGE_API_ENCRYPTION_KEY is not properly configured.');
    throw new Error('Encryption service is not properly configured.');
  }

  try {
    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag(); // Get the authentication tag
    // Store iv, authTag, and encrypted text. Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data.');
  }
}

export function decrypt(encryptedDataWithIvAndTag) {
  if (!encryptedDataWithIvAndTag) return null;
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('Decryption cannot proceed: EXCHANGE_API_ENCRYPTION_KEY is not properly configured.');
    throw new Error('Decryption service is not properly configured.');
  }

  try {
    const parts = encryptedDataWithIvAndTag.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected iv:authTag:encrypted.');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag); // Set the authentication tag
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    if (error.message.toLowerCase().includes('unsupported state or bad tag')) {
        throw new Error('Decryption failed: Invalid key or corrupted data (bad auth tag).');
    }
    throw new Error('Failed to decrypt data.');
  }
}
