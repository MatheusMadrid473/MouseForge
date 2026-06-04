import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');

  return `${HASH_PREFIX}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedPassword: string) {
  const [prefix, salt, storedHash] = storedPassword.split(':');

  if (prefix !== HASH_PREFIX || !salt || !storedHash) {
    return password === storedPassword;
  }

  const candidateHash = scryptSync(password, salt, KEY_LENGTH);
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  if (storedHashBuffer.length !== candidateHash.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, storedHashBuffer);
}
