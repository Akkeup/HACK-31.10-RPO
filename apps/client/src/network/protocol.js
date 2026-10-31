import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { protocolSchemas } from "../protocol/schemas.js";
export const VERSION = "2.0.0";
const base = "https://discovery.invalid/protocol/2.0.0/";
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
});
addFormats(ajv);
for (const schema of protocolSchemas) ajv.addSchema(schema);
export function validate(name, value, definition) {
  const ref =
    base + name + ".schema.json" + (definition ? "#/$defs/" + definition : "");
  const check = ajv.getSchema(ref) || ajv.compile({ $ref: ref });
  if (!check(value))
    throw Object.assign(
      new Error(
        "INVALID_REQUEST: " + ajv.errorsText(check.errors, { separator: "; " }),
      ),
      { code: "INVALID_REQUEST" },
    );
  return value;
}
export function parseJSON(raw, maxBytes = 65536) {
  if (
    typeof raw !== "string" ||
    new TextEncoder().encode(raw).length > maxBytes
  )
    throw Error("INVALID_REQUEST: размер JSON");
  if (raw.charCodeAt(0) === 0xfeff) throw Error("INVALID_REQUEST: BOM");
  const value = JSON.parse(raw);
  const stack = [];
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "{") stack.push(new Set());
    else if (c === "[") stack.push(null);
    else if (c === "}" || c === "]") stack.pop();
    else if (c === '"') {
      const start = i++;
      for (; i < raw.length; i++) {
        if (raw[i] === "\\") {
          i++;
          continue;
        }
        if (raw[i] === '"') break;
      }
      let j = i + 1;
      while (/\s/.test(raw[j] || "") && j < raw.length) j++;
      if (raw[j] === ":") {
        const key = JSON.parse(raw.slice(start, i + 1)),
          keys = stack.at(-1);
        if (keys?.has(key))
          throw Error("INVALID_REQUEST: повторный ключ " + key);
        keys?.add(key);
      }
    }
  }
  return value;
}
export function parseEvent(raw) {
  return validate(
    "server-message",
    typeof raw === "string" ? parseJSON(raw) : raw,
  );
}
export function safeRandomUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  try {
    crypto.randomUUID = safeRandomUUID;
  } catch {}
}
export function safeSha256Hex(data) {
  function rightRotate(v, a) { return (v >>> a) | (v << (32 - a)); }
  const byteLen = data.length;
  const bitLen = byteLen * 8;
  const words = [];
  for (let i = 0; i < byteLen; i++) { words[i >> 2] |= data[i] << (24 - (i % 4) * 8); }
  words[byteLen >> 2] |= 0x80 << (24 - (byteLen % 4) * 8);
  const wordCount = (((byteLen + 8) >> 6) + 1) * 16;
  while (words.length < wordCount - 2) words.push(0);
  words.push(Math.floor(bitLen / 0x100000000) | 0);
  words.push((bitLen & 0xffffffff) | 0);
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  for (let j = 0; j < words.length; j += 16) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) w[i] = words[j + i] | 0;
    for (let i = 16; i < 64; i++) {
      const s0 = (rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3));
      const s1 = (rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10));
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
    for (let i = 0; i < 64; i++) {
      const S1 = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25));
      const ch = ((e & f) ^ ((~e) & g));
      const temp1 = (h + S1 + ch + k[i] + w[i]) | 0;
      const S0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22));
      const maj = ((a & b) ^ (a & c) ^ (b & c));
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    hash[0] = (hash[0] + a) | 0; hash[1] = (hash[1] + b) | 0; hash[2] = (hash[2] + c) | 0; hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0; hash[5] = (hash[5] + f) | 0; hash[6] = (hash[6] + g) | 0; hash[7] = (hash[7] + h) | 0;
  }
  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      result += ((hash[i] >>> (j * 8)) & 0xff).toString(16).padStart(2, '0');
    }
  }
  return result;
}
export async function safeDigestSha256(data) {
  if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
    try {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
    } catch {}
  }
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  return safeSha256Hex(u8);
}
if (typeof crypto !== "undefined") {
  if (!crypto.subtle) {
    try { crypto.subtle = {}; } catch {}
  }
  if (crypto.subtle && !crypto.subtle.digest) {
    crypto.subtle.digest = async function (_algo, data) {
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      const hex = safeSha256Hex(u8);
      const out = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      return out.buffer;
    };
  }
}
export function command(type, payload, requestId = safeRandomUUID()) {
  return validate("client-message", {
    protocolVersion: VERSION,
    type,
    requestId,
    payload,
  });
}
export function movement(
  inputSeq,
  input,
  yawRad,
  interestRevision,
  running = false,
) {
  return command("player.input", {
    inputSeq,
    moveX: input[0],
    moveZ: input[1],
    yawRad,
    running,
    interestRevision,
  });
}
