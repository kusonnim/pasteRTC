import qrcode from "qrcode-generator";

const ERROR_CORRECTION_LEVEL = "M";
const CELL_SIZE = 4;
const QUIET_ZONE_MODULES = 4;
const QUIET_ZONE_SIZE = QUIET_ZONE_MODULES * CELL_SIZE;

export function generate(target, text) {
  if (!target || typeof target !== "object") {
    throw new TypeError("QR target must be a canvas or image element.");
  }

  if (typeof text !== "string") {
    throw new TypeError("QR text must be a string.");
  }

  const qr = createQr(text);

  if (isCanvasElement(target)) {
    renderCanvas(target, qr);
    return target;
  }

  if (isImageElement(target)) {
    target.src = qr.createDataURL(CELL_SIZE, QUIET_ZONE_SIZE);
    return target;
  }

  throw new TypeError("QR target must be a canvas or image element.");
}

function createQr(text) {
  const qr = qrcode(0, ERROR_CORRECTION_LEVEL);
  qr.addData(text);
  qr.make();
  return qr;
}

function renderCanvas(canvas, qr) {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new TypeError("QR canvas target must provide a 2D rendering context.");
  }

  const moduleCount = qr.getModuleCount();
  const size = (moduleCount + QUIET_ZONE_MODULES * 2) * CELL_SIZE;

  canvas.width = size;
  canvas.height = size;

  context.fillStyle = "#fff";
  context.fillRect(0, 0, size, size);

  context.fillStyle = "#000";

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (qr.isDark(row, column)) {
        context.fillRect(
          (column + QUIET_ZONE_MODULES) * CELL_SIZE,
          (row + QUIET_ZONE_MODULES) * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE,
        );
      }
    }
  }
}

function isCanvasElement(target) {
  return typeof target.getContext === "function";
}

function isImageElement(target) {
  return typeof target.tagName === "string"
    && target.tagName.toLowerCase() === "img"
    && "src" in target;
}
