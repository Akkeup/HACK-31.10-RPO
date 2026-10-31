// Convert only the selected CC0 KayKit Furniture Bits glTF props to self-contained GLB.
import { readFile, writeFile } from "node:fs/promises";
const source = new URL("../../../assets/models/external/kaykit-furniture-bits/", import.meta.url);
const target = new URL("../public/assets/models/furniture/", import.meta.url);
const selections = [
  ["chair_A_wood", "chair"],
  ["book_single", "book"],
  ["lamp_table", "lamp-table"],
];
const pad = (bytes, fill = 0) => Buffer.concat([bytes, Buffer.alloc((4 - bytes.length % 4) % 4, fill)]);
for (const [name, output] of selections) {
  const gltf = JSON.parse(await readFile(new URL(`${name}.gltf`, source), "utf8"));
  const geometry = await readFile(new URL(`${name}.bin`, source));
  const texture = await readFile(new URL("furniturebits_texture.png", source));
  if (gltf.buffers?.length !== 1 || gltf.images?.length !== 1 || gltf.buffers[0].uri !== `${name}.bin` || gltf.images[0].uri !== "furniturebits_texture.png")
    throw Error(`Unexpected KayKit source references: ${name}`);
  const imageOffset = pad(geometry).length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: imageOffset, byteLength: texture.length });
  gltf.images[0].bufferView = gltf.bufferViews.length - 1;
  delete gltf.images[0].uri;
  delete gltf.buffers[0].uri;
  const binary = pad(Buffer.concat([pad(geometry), pad(texture)]));
  gltf.buffers[0].byteLength = binary.length;
  const json = pad(Buffer.from(JSON.stringify(gltf)), 0x20);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + binary.length, 8);
  const chunk = (bytes, kind) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(bytes.length, 0);
    head.writeUInt32LE(kind, 4);
    return Buffer.concat([head, bytes]);
  };
  await writeFile(new URL(`${output}.glb`, target), Buffer.concat([
    header, chunk(json, 0x4e4f534a), chunk(binary, 0x004e4942),
  ]));
  console.log(`${name} -> ${output}.glb`);
}
