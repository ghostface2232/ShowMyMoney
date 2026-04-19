// PIN 해시/검증 및 유효성 검사 유틸. bcryptjs 10 rounds, 숫자만 6~12자리.
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
