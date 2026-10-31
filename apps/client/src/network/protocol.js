import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { protocolSchemas } from "../protocol/schemas.js";
import { safeRandomUUID } from "./crypto.js";
export { safeRandomUUID, safeSha256Hex, safeDigestSha256 } from "./crypto.js";
export const VERSION = "2.0.0";
export const API_ROOT = "/api/v2";
export const WS_SUBPROTOCOL = "discovery.v2";
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
