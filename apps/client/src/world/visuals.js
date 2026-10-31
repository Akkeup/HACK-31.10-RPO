import * as THREE from "three";

export function textTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export function nameTag(text, color = "#fff8e6") {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  const parts = String(text).split(" · ");
  const lines = parts.length > 1 ? [parts.shift(), parts.join(" · ")] : parts;
  canvas.height = lines.length > 1 ? 256 : 144;
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(25,30,25,.92)";
  ctx.lineWidth = 7;
  ctx.fillStyle = color;
  lines.forEach((line, i) => {
    let size = i ? 66 : 82;
    do {
      ctx.font = `800 ${size--}px system-ui, sans-serif`;
    } while (ctx.measureText(line).width > canvas.width - 64 && size > 28);
    const y = lines.length > 1 ? 68 + i * 116 : 72;
    ctx.strokeText(line, canvas.width / 2, y);
    ctx.fillText(line, canvas.width / 2, y);
  });
  const material = new THREE.SpriteMaterial({
    map: textTexture(canvas),
    depthTest: true,
    depthWrite: false,
    transparent: true,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.8, (2.8 * canvas.height) / canvas.width, 1);
  sprite.position.y = 2.4;
  return sprite;
}
