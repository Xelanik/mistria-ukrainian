// Картинки для сторінки мода (Nexus, GitHub): обкладинка й картка встановлення.
//
// Запуск: npm run media   → release/media/*.png
//
// Малюється з нуля шрифтом гри birdseed (як у мові «Українська»), без жодного арту гри: у кадрі лише текст і прості
// фігури в синьо-жовтих кольорах. Логічне полотно 320×180, збільшується ×4 до 1280×720 (16:9).

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { assetsDir, gameVersion, root } from "./lib";
import { blank, writePng } from "./png";
import type { Image } from "./png";
import { paint, rasterize, scaleBitmap, width } from "./sprites";
import type { Color } from "./sprites";

const W = 320;
const H = 180;
const ZOOM = 4;

const BLUE: Color = [0, 87, 183];
const SKY: Color = [70, 140, 215];
const YELLOW: Color = [255, 213, 0];
const WHEAT: Color = [226, 170, 0];
const WHEAT_DARK: Color = [176, 120, 0];
const NAVY: Color = [10, 26, 58];
const WHITE: Color = [255, 255, 255];
const PINK: Color = [239, 196, 193];

const fontPath = join(assetsDir(gameVersion()), "fonts", "fnt_mistria_birdseed.ttf");
const cache = new Map<string, ReturnType<typeof rasterize>>();
const glyphs = (text: string) => {
  if (!cache.has(text)) cache.set(text, rasterize(fontPath, text));
  return cache.get(text)!;
};

function rect(image: Image, x: number, y: number, w: number, h: number, color: Color) {
  for (let py = Math.max(0, y); py < Math.min(image.height, y + h); py++)
    for (let px = Math.max(0, x); px < Math.min(image.width, x + w); px++) image.data.set([...color, 255], (py * image.width + px) * 4);
}

/** Текст із тінню; x = «center» центрує по ширині полотна. */
function text(image: Image, value: string, x: number | "center", y: number, color: Color, scale = 1, shadow: Color = NAVY) {
  const bitmap = scaleBitmap(glyphs(value).bitmap, scale, scale);
  const left = x === "center" ? Math.round((image.width - width(bitmap)) / 2) : x;
  paint(image, bitmap, left + scale, y + scale, shadow);
  paint(image, bitmap, left, y, color);
}

/** Тло: синє небо, жовте поле з колоссям (натяк на прапор і «Fields»). */
function background(image: Image, horizon = 100) {
  const { width: W, height: H } = image;
  rect(image, 0, 0, W, horizon, BLUE);
  for (let y = 0; y < horizon; y += 4) rect(image, 0, y, W, 2, y % 8 === 0 ? SKY : BLUE);
  rect(image, 0, horizon, W, H - horizon, YELLOW);
  // Колосся: стебло 1 піксель, колос — зубчик; ряди зсунуті для глибини.
  for (let row = 0; row < 4; row++) {
    const baseY = horizon + 12 + row * 18;
    for (let x = (row * 3) % 7; x < W; x += 7) {
      const top = baseY - 6 - ((x * 13 + row * 5) % 5);
      rect(image, x, top, 1, baseY - top + 10, row % 2 ? WHEAT : WHEAT_DARK);
      for (let k = 0; k < 3; k++) {
        rect(image, x - 1, top + k * 2, 1, 1, WHEAT_DARK);
        rect(image, x + 1, top + k * 2 + 1, 1, 1, WHEAT_DARK);
      }
    }
  }
}

function panel(image: Image, x: number, y: number, w: number, h: number) {
  rect(image, x, y, w, h, NAVY);
  rect(image, x + 1, y + 1, w - 2, h - 2, [24, 48, 96]);
  rect(image, x + 2, y + 2, w - 4, h - 4, NAVY);
}

function finish(image: Image, name: string) {
  const { width: W } = image;
  const out = blank(image.width * ZOOM, image.height * ZOOM);
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++)
      out.data.set(image.data.subarray(((y / ZOOM | 0) * W + (x / ZOOM | 0)) * 4, ((y / ZOOM | 0) * W + (x / ZOOM | 0)) * 4 + 4), (y * out.width + x) * 4);
  const dir = join(root, "release", "media");
  mkdirSync(dir, { recursive: true });
  writePng(join(dir, name), out);
  console.log(`release/media/${name}: ${out.width}×${out.height}`);
}

// ---------- Обкладинка ----------
{
  const image = blank(W, H);
  background(image);
  panel(image, 24, 10, 272, 124);
  text(image, "Fields of Mistria", "center", 20, PINK, 2);
  text(image, "FoM-UA", "center", 44, WHITE, 4, [0, 40, 100]);
  text(image, "Українська локалізація", "center", 100, YELLOW, 2);
  text(image, "Інтерфейс / Меню / Туторіали / HUD / Крафт", "center", 150, NAVY, 1, YELLOW);
  text(image, "v0.1 / потрібен MOMI", "center", 163, NAVY, 1, YELLOW);
  finish(image, "cover.png");
}

// ---------- Картка встановлення ----------
{
  const image = blank(W, H);
  background(image);
  panel(image, 20, 12, 280, 156);
  text(image, "Встановлення", "center", 20, YELLOW, 2);
  const steps = ["1. Оновіть MOMI до останньої версії", "2. Тека FoM-UA лягає в mods/ біля гри", "3. Увімкніть мод у MOMI і натисніть Apply", "4. У грі оберіть мову «Українська»"];
  steps.forEach((step, i) => text(image, step, 36, 56 + i * 20, WHITE, 1));
  text(image, "Не вмикайте разом з іншими модами мови ukr", "center", 148, PINK, 1);
  finish(image, "install.png");
}

// ---------- Банер сторінки мода (Nexus: 1300×372) ----------
{
  const image = blank(325, 93);
  background(image, 52);
  panel(image, 8, 6, 309, 58);
  text(image, "FoM-UA", 20, 14, WHITE, 3, [0, 40, 100]);
  text(image, "Fields of Mistria", 20, 46, PINK, 1);
  text(image, "Українська", 160, 9, YELLOW, 2);
  text(image, "локалізація", 160, 31, YELLOW, 2);
  text(image, "v0.1 / Інтерфейс / Меню / Туторіали / потрібен MOMI", "center", 73, NAVY, 1, YELLOW);
  finish(image, "header.png");
}
