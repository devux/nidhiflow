import crypto from "node:crypto";

const derivedKeyLength = 64;
const saltLength = 16;
const weakPasswords = new Set([
  "123456789012",
  "123456789123",
  "1234567890ab",
  "aaaaaaaaaaaa",
  "password1234",
  "passwordpassword",
  "qwerty123456",
  "welcome12345",
]);

function scrypt(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, derivedKeyLength, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export function isWeakPassword(password: string) {
  return weakPasswords.has(password.toLowerCase());
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(saltLength);
  const derivedKey = await scrypt(password, salt);

  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, saltHex, hashHex] = encodedHash.split("$");

  if (algorithm !== "scrypt" || !saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, salt);

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}
