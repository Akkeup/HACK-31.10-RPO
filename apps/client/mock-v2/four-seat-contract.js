// User-requested draft for four seats. This validator belongs ONLY to the
// in-process demo adapter; released HTTP/WebSocket validation is untouched.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { protocolSchemas } from "../src/protocol/schemas.js";
import { parseJSON } from "../src/network/protocol.js";
import patch from "./four-seat-contract.patch.json" with { type: "json" };

export const previewProfile = patch.profile;
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const released of protocolSchemas) {
  const schema = structuredClone(released);
  for (const change of patch.changes) {
    if (!schema.$id.endsWith("/" + change.schema)) continue;
    const path = change.path.slice(1).split("/");
    const key = path.pop();
    let node = schema;
    for (const part of path) node = node[part];
    if (node[key] !== 5)
      throw Error("Four-seat draft no longer matches its released base");
    node[key] = change.value;
  }
  ajv.addSchema(schema);
}
export function validate(name, value, definition) {
  const ref =
    "https://discovery.invalid/protocol/2.0.0/" +
    name +
    ".schema.json" +
    (definition ? "#/$defs/" + definition : "");
  const check = ajv.getSchema(ref) || ajv.compile({ $ref: ref });
  if (!check(value))
    throw Object.assign(
      Error("INVALID_REQUEST: draft: " + ajv.errorsText(check.errors)),
      { code: "INVALID_REQUEST" },
    );
  return value;
}
export function parseEvent(raw) {
  return validate(
    "server-message",
    typeof raw === "string" ? parseJSON(raw) : raw,
  );
}
