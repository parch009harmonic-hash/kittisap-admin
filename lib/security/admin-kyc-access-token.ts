import { createHmac, timingSafeEqual } from "node:crypto";

type AdminKycAccessTokenPayload = {
  actorUserId: string;
  customerId: string;
  exp: number;
};

function getTokenSecret() {
  const secret = String(
    process.env.ADMIN_KYC_ACCESS_TOKEN_SECRET
      ?? process.env.SUPABASE_SERVICE_ROLE_KEY
      ?? "",
  ).trim();
  if (!secret) {
    throw new Error("Missing ADMIN_KYC_ACCESS_TOKEN_SECRET");
  }
  return secret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadPart: string, secret: string) {
  return createHmac("sha256", secret).update(payloadPart).digest("base64url");
}

function safeEqualText(a: string, b: string) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

export function issueAdminKycAccessToken(input: { actorUserId: string; customerId: string; ttlSeconds?: number }) {
  const ttl = Math.max(30, Math.min(3600, Number(input.ttlSeconds ?? 300)));
  const payload: AdminKycAccessTokenPayload = {
    actorUserId: input.actorUserId,
    customerId: input.customerId,
    exp: Math.floor(Date.now() / 1000) + ttl,
  };

  const payloadPart = encode(JSON.stringify(payload));
  const secret = getTokenSecret();
  const signaturePart = sign(payloadPart, secret);
  return {
    token: `${payloadPart}.${signaturePart}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

export function verifyAdminKycAccessToken(input: { token: string; actorUserId: string; customerId: string }) {
  const tokenText = String(input.token ?? "").trim();
  const [payloadPart = "", signaturePart = ""] = tokenText.split(".");
  if (!payloadPart || !signaturePart) {
    throw new Error("Invalid access token");
  }

  const secret = getTokenSecret();
  const expectedSignature = sign(payloadPart, secret);
  if (!safeEqualText(signaturePart, expectedSignature)) {
    throw new Error("Invalid access token");
  }

  let payload: AdminKycAccessTokenPayload;
  try {
    payload = JSON.parse(decode(payloadPart)) as AdminKycAccessTokenPayload;
  } catch {
    throw new Error("Invalid access token");
  }

  if (
    !payload
    || typeof payload.actorUserId !== "string"
    || typeof payload.customerId !== "string"
    || typeof payload.exp !== "number"
  ) {
    throw new Error("Invalid access token");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSec) {
    throw new Error("Access token expired");
  }
  if (payload.actorUserId !== input.actorUserId || payload.customerId !== input.customerId) {
    throw new Error("Access token mismatch");
  }

  return payload;
}
