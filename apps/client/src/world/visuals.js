import * as THREE from "three";
export function nameTag(text, color = "#455344") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.font = "500 31px system-ui";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(250,249,240,.95)";
  ctx.beginPath();
  ctx.roundRect(
    256 - ctx.measureText(text).width / 2 - 22,
    13,
    ctx.measureText(text).width + 44,
    57,
    28,
  );
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 52);
  const material = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    depthTest: true,
    depthWrite: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.2, 0.412, 1);
  sprite.position.y = 2.55;
  return sprite;
}
