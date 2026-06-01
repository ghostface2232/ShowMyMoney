// PIN hashing/verification and validation utils. bcryptjs 10 rounds, digits only, 6~12 characters.
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;
const PIN_REGEX = /^\d{6,12}$/;

export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
