import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PIN_HASH_PREFIX = "s1";

function toBuffer(value: string) {
  return Buffer.from(value, "base64url");
}

function encode(buffer: Buffer) {
  return buffer.toString("base64url");
}

export function isSixDigitPin(pin: string) {
  return /^\d{6}$/.test(pin);
}

export async function hashPin(pin: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(pin, salt, 32)) as Buffer;
  return `${PIN_HASH_PREFIX}$${encode(salt)}$${encode(derived)}`;
}

export async function verifyPin(pin: string, storedHash: string) {
  const parts = String(storedHash ?? "").split("$");
  if (parts.length !== 3 || parts[0] !== PIN_HASH_PREFIX) {
    return false;
  }

  const salt = toBuffer(parts[1] ?? "");
  const expected = toBuffer(parts[2] ?? "");
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  const computed = (await scrypt(pin, salt, expected.length)) as Buffer;
  if (computed.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(computed, expected);
}
