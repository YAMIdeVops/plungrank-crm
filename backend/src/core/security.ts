import { createHash, pbkdf2Sync, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import jwt from "jsonwebtoken";

import { getSettings } from "../config";

interface TokenUser {
  id: string;
  email: string;
  perfil: string;
  status: string;
}

function randomSalt(length = 16): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(length);
  let salt = "";
  for (let index = 0; index < length; index += 1) {
    salt += alphabet[bytes[index] % alphabet.length];
  }
  return salt;
}

function digestSizeFor(hashName: string) {
  return createHash(hashName).digest().length;
}

function computeWerkzeugHash(method: string, salt: string, password: string): string {
  if (method.startsWith("scrypt")) {
    const [, nValue = "32768", rValue = "8", pValue = "1"] = method.split(":");
    const N = Number(nValue);
    const r = Number(rValue);
    const p = Number(pValue);
    const digest = scryptSync(password, salt, 32, {
      N,
      r,
      p,
      maxmem: Math.max(128 * N * r * p + 1024, 64 * 1024 * 1024),
    });
    return digest.toString("hex");
  }

  if (method.startsWith("pbkdf2")) {
    const [, hashName = "sha256", iterationsValue = "1000000"] = method.split(":");
    const digest = pbkdf2Sync(
      password,
      salt,
      Number(iterationsValue),
      digestSizeFor(hashName),
      hashName,
    );
    return digest.toString("hex");
  }

  throw new Error(`Unsupported password hash method: ${method}`);
}

export function hashPassword(password: string): string {
  const method = "scrypt:32768:8:1";
  const salt = randomSalt(16);
  const digest = computeWerkzeugHash(method, salt, password);
  return `${method}$${salt}$${digest}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const parts = passwordHash.split("$");
  if (parts.length !== 3) {
    return false;
  }

  const [method, salt, expected] = parts;
  try {
    const actual = computeWerkzeugHash(method, salt, password);
    return timingSafeEqual(Buffer.from(actual, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

export function createAccessToken(user: TokenUser): string {
  const settings = getSettings();
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    perfil: user.perfil,
    status: user.status,
    iat: now,
    exp: now + settings.jwtExpiresInHours * 60 * 60,
  };

  return jwt.sign(payload, settings.jwtSecretKey, { algorithm: "HS256", noTimestamp: true });
}

export function decodeAccessToken(token: string) {
  const settings = getSettings();
  return jwt.verify(token, settings.jwtSecretKey, {
    algorithms: ["HS256"],
  }) as {
    sub: string;
    email: string;
    perfil: string;
    status: string;
    iat: number;
    exp: number;
  };
}
