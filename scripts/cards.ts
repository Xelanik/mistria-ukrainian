// Картки туторіалів: міні-скриншоти гри з англійським текстом її шрифтом. Для кожного рядка знаходимо його рамку за
// кольором тексту, витираємо (заливка кольором тла ліворуч у кожному рядку) і малюємо український текст тим самим
// шрифтом на тому самому місці. Решта картки — оригінальний арт гри (змінений спрайт).

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "smol-toml";
import { readPng, writePng } from "./png";
import { glyphBitmap, lvlBitmap, rasterize, scaleBitmap, width } from "./sprites";
import type { Bitmap, Color } from "./sprites";

export type Edit = {
  /** Де шукати рядок: [x0, y0, x1, y1] включно. Лише цей рядок, без сусідніх написів і арту. */
  region: [number, number, number, number];
  /** Кольори пікселів оригінального тексту (тінь не потрібна: вона на піксель праворуч-вниз і витирається разом). */
  inks: Color[];
  text: string;
  /** game — шрифт гри (birdseed); bold — жирний піксельний 5 рядків (дні тижня); lvl — «РІВ.» заввишки 3 пікселі. */
  font?: "game" | "bold" | "lvl";
  /** Вирівнювання відносно знайденої рамки: left (типово), center, right. */
  align?: "left" | "center" | "right";
  /** Для center: оригінальний повний рядок, якщо в картці він обрізаний краєм (центр рахується за його шириною). */
  was?: string;
  /** Зсув готового тексту відносно знайденого місця. */
  dx?: number;
  dy?: number;
  /** Явний рядок верху прописних літер, якщо оригінал обрізано зверху. */
  top?: number;
  /** Розмістити відразу після тексту з цим індексом (через gap пікселів). */
  after?: number;
  gap?: number;
  /** Збільшити текст у стільки разів (напис завантаження — шрифт гри ×2). */
  scale?: number;
  /** Не малювати правіше за цей x (панель обрізана краєм картки). */
  clipRight?: number;
  color: Color;
  /** Колір тіні (на піксель праворуч-вниз); без нього тіні нема. */
  shadow?: Color;
  /** Колір заливки; без нього береться піксель ліворуч від рамки в кожному рядку. */
  fill?: Color;
};

export function editCard(assetsDir: string, path: string, edits: Edit[]) {
  const image = readPng(path);
  const at = (x: number, y: number) => (y * image.width + x) * 4;
  const pixel = (x: number, y: number) => [image.data[at(x, y)]!, image.data[at(x, y) + 1]!, image.data[at(x, y) + 2]!] as Color;
  const fontPath = join(assetsDir, "fonts", "fnt_mistria_birdseed.ttf");

  // Спершу знаходимо рамки всіх рядків і витираємо, щоб редагування не заважали одне одному.
  const found = edits.map((edit) => {
    const [x0, y0, x1, y1] = edit.region;
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const [r, g, b] = pixel(x, y);
        if (!edit.inks.some(([ir, ig, ib]) => ir === r && ig === g && ib === b)) continue;
        xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
      }
    }
    if (!Number.isFinite(xmin)) throw new Error(`${path}: у ділянці [${edit.region}] немає тексту «${edit.text}»`);
    return { xmin, xmax, ymin, ymax };
  });
  edits.forEach((edit, i) => {
    const { xmin, xmax, ymin, ymax } = found[i]!;
    for (let y = ymin - 1; y <= ymax + 1; y++) {
      const sample = at(Math.max(0, xmin - 2), y);
      const fill = edit.fill ?? pixel(Math.max(0, xmin - 2), y);
      // На прозорому тлі (напис завантаження) стираємо до прозорості, а не до чорного.
      const alpha = edit.fill ? 255 : image.data[sample + 3]!;
      for (let x = xmin - 1; x <= xmax + 1; x++) image.data.set([...(alpha === 0 ? [0, 0, 0] : fill), alpha], at(x, y));
    }
  });

  const drawn: { left: number; width: number }[] = [];
  edits.forEach((edit, i) => {
    const { xmin, xmax, ymin } = found[i]!;
    const font = edit.font ?? "game";
    let bitmap: Bitmap;
    let capTop = 0;
    if (font === "bold") bitmap = glyphBitmap(edit.text);
    else if (font === "lvl") bitmap = lvlBitmap();
    else ({ bitmap, capTop } = rasterize(fontPath, edit.text));
    if (edit.scale && edit.scale > 1) {
      bitmap = scaleBitmap(bitmap, edit.scale, edit.scale);
      capTop *= edit.scale;
    }
    const w = width(bitmap);
    let left: number;
    if (edit.after !== undefined) left = drawn[edit.after]!.left + drawn[edit.after]!.width + (edit.gap ?? 4);
    else if (edit.align === "center") {
      const wasWidth = edit.was ? width(font === "bold" ? glyphBitmap(edit.was) : rasterize(fontPath, edit.was).bitmap) : xmax + 1 - xmin;
      left = Math.round(xmin + (wasWidth - w) / 2);
    } else if (edit.align === "right") left = xmax + 1 - w;
    else left = xmin;
    left += edit.dx ?? 0;
    const top = (edit.top ?? ymin) - capTop + (edit.dy ?? 0);
    drawn.push({ left, width: w });
    const put = (ox: number, oy: number, color: Color) =>
      bitmap.forEach((row, y) =>
        row.forEach((on, x) => {
          const px = left + ox + x;
          const py = top + oy + y;
          if (!on || px < 0 || py < 0 || px >= image.width || py >= image.height || px > (edit.clipRight ?? image.width)) return;
          image.data.set([...color, 255], at(px, py));
        }),
      );
    if (edit.shadow) put(1, 1, edit.shadow);
    put(0, 0, edit.color);
  });
  writePng(path, image);
}

// ---------- Специфікації карток ----------

const DIALOGUE = { inks: [[231, 231, 231]] as Color[], color: [231, 231, 231] as Color, shadow: [33, 33, 33] as Color };
const BLACK_CREAM = { inks: [[0, 0, 0]] as Color[], color: [0, 0, 0] as Color, shadow: [221, 203, 218] as Color };
const BLACK_PINK = { inks: [[0, 0, 0]] as Color[], color: [0, 0, 0] as Color, shadow: [217, 160, 176] as Color };
const BLACK_GOLD = { inks: [[0, 0, 0]] as Color[], color: [0, 0, 0] as Color, shadow: [227, 176, 136] as Color };
const WHITE_BLUE = { inks: [[240, 240, 240]] as Color[], color: [240, 240, 240] as Color, shadow: [33, 33, 33] as Color };
const GREEN = { inks: [[52, 131, 107]] as Color[], color: [52, 131, 107] as Color, shadow: [221, 203, 218] as Color };
const FADED = { inks: [[145, 121, 138]] as Color[], color: [145, 121, 138] as Color, shadow: [221, 203, 218] as Color };
const WEEKDAY_FADED = { inks: [[177, 86, 106]] as Color[], color: [177, 86, 106] as Color, shadow: [199, 183, 196] as Color, font: "bold" as const, align: "center" as const };
const WEEKDAY = { inks: [[196, 94, 118]] as Color[], color: [196, 94, 118] as Color, shadow: [221, 203, 218] as Color, font: "bold" as const, align: "center" as const };
const CREAM: Color = [242, 227, 237];
const LVL = { inks: [[255, 255, 255]] as Color[], color: [255, 255, 255] as Color, shadow: [33, 33, 33] as Color, font: "lvl" as const, text: "РІВ." };

/** [папка, назва спрайта без суфікса мови, правки]. */
const CARDS: [string, string, Edit[]][] = [
  ["Dating", "spr_ui_tutorial_dating_1", [
    { ...DIALOGUE, region: [12, 15, 172, 29], text: "Ти теж мій найкращий друг," },
    { ...DIALOGUE, region: [12, 30, 172, 40], text: "Селіно." },
    { ...DIALOGUE, region: [12, 57, 160, 70], text: "У мене до тебе теж почуття," },
    { ...DIALOGUE, region: [12, 71, 160, 80], text: "Селіно." },
  ]],
  ["Dating", "spr_ui_tutorial_dating_3", [
    { ...WEEKDAY_FADED, region: [0, 16, 24, 25], text: "СР", fill: [217, 203, 212] },
    { ...WEEKDAY_FADED, region: [38, 16, 62, 25], text: "ЧТ" },
    { ...WEEKDAY_FADED, region: [78, 16, 99, 25], text: "ПТ" },
    { ...WEEKDAY, region: [118, 16, 139, 25], text: "СБ" },
    { ...WEEKDAY, region: [154, 16, 181, 25], text: "НД" },
  ]],
  ["Dating", "spr_ui_tutorial_dating_4", [
    { ...WEEKDAY, shadow: [220, 202, 217], inks: [[196, 95, 118]], color: [196, 95, 118], region: [28, 14, 62, 25], text: "СБ" },
    { ...WEEKDAY, shadow: [220, 202, 217], inks: [[196, 95, 118]], color: [196, 95, 118], region: [122, 14, 155, 25], text: "НД" },
  ]],
  ["Engagement", "spr_ui_tutorial_engagement_3", [
    { ...DIALOGUE, region: [52, 20, 186, 33], text: "Я кохаю тебе, Райсе." },
    { ...DIALOGUE, region: [52, 34, 186, 47], text: "Одружимось?" },
    { ...DIALOGUE, region: [52, 60, 186, 74], text: "Власне, давай про це" },
    { ...DIALOGUE, region: [52, 75, 186, 88], text: "поговоримо іншого дня." },
  ]],
  ["Engagement", "spr_ui_tutorial_engagement_5", [
    { ...BLACK_CREAM, region: [58, 16, 160, 31], text: "Марч", fill: CREAM },
    { ...BLACK_CREAM, region: [58, 33, 160, 47], text: "Весна 16", fill: CREAM },
    { ...BLACK_CREAM, region: [58, 48, 160, 61], text: "Коваль", fill: CREAM },
    { ...GREEN, shadow: [182, 167, 183], region: [58, 62, 160, 76], text: "Найкращі друзі", fill: CREAM },
  ]],
  ["Magic", "spr_ui_tutorial_magic_2", [
    { ...BLACK_PINK, region: [53, 8, 91, 18], text: "Магічні закляття", align: "center", was: "Magic Spells", clipRight: 91 },
    { ...BLACK_CREAM, region: [25, 34, 91, 46], text: "Повне відновлення", clipRight: 91, fill: CREAM },
    { ...BLACK_CREAM, region: [25, 74, 91, 88], text: "Ріст", clipRight: 91, fill: [255, 255, 255] },
  ]],
  ["Magic", "spr_ui_tutorial_magic_4", [
    { ...BLACK_CREAM, region: [20, 4, 80, 18], text: "Назва", align: "center" },
    { ...BLACK_CREAM, region: [10, 20, 90, 34], text: "Повне", align: "center", dy: -3 },
    { ...BLACK_CREAM, region: [10, 20, 90, 34], text: "відновлення", align: "center", dy: 6 },
    { ...BLACK_CREAM, region: [30, 40, 70, 52], text: "Тип", align: "center" },
    { ...BLACK_CREAM, region: [20, 58, 80, 70], text: "Лікування", align: "center" },
    { ...BLACK_CREAM, region: [30, 76, 70, 85], text: "Вартість", align: "center" },
  ]],
  ["Mines", "spr_ui_tutorial_mines_6", [
    { ...BLACK_CREAM, region: [107, 3, 172, 13], text: "Ранг міста:", top: 4, clipRight: 186 },
    { ...GREEN, region: [173, 3, 186, 12], text: "Мідь", top: 4, after: 0, gap: 4, clipRight: 186 },
    { ...BLACK_PINK, region: [150, 21, 186, 33], text: "Спорядження", align: "center", was: "Equipment", clipRight: 186 },
    { ...BLACK_PINK, region: [160, 76, 186, 86], text: "Навички", align: "center", was: "Skills", clipRight: 186 },
  ]],
  ["Mines", "spr_ui_tutorial_mines_7", [
    { ...WHITE_BLUE, region: [120, 9, 160, 19], text: "Навички", align: "center" },
    { ...LVL, region: [104, 81, 120, 87] },
    { ...LVL, region: [153, 81, 169, 87] },
  ]],
  ["Ranching", "spr_ui_tutorial_ranching_1", [
    { ...BLACK_PINK, region: [150, 8, 186, 22], text: "Курка", align: "center", was: "Chicken", clipRight: 186 },
    { ...BLACK_CREAM, region: [115, 38, 170, 52], text: "Коричнева" },
    { ...BLACK_CREAM, region: [115, 76, 175, 90], text: "Ряба" },
  ]],
  ["Skill Perks", "spr_ui_tutorial_skill_perks_2", [
    { ...WHITE_BLUE, region: [100, 9, 150, 19], text: "Навички", align: "center" },
    { ...LVL, region: [94, 88, 108, 96] },
    { ...LVL, region: [141, 88, 155, 96] },
  ]],
  ["Skill Perks", "spr_ui_tutorial_skill_perks_3", [
    { ...BLACK_PINK, region: [60, 16, 130, 28], text: "Освіжання", align: "center" },
    { ...BLACK_CREAM, region: [36, 50, 165, 63], text: "Поливання культури" },
    { ...BLACK_CREAM, region: [36, 64, 165, 76], text: "іноді повертає витрачену" },
    { ...BLACK_CREAM, region: [36, 77, 165, 90], text: "витривалість." },
  ]],
  ["Skill Perks", "spr_ui_tutorial_skill_perks_4", [
    // «Землеробство» (72 пікселі) не вміщається в заголовок завширшки 70, тому в картці скорочено.
    { ...WHITE_BLUE, region: [5, 4, 70, 20], text: "Землероб." },
    { ...WHITE_BLUE, region: [70, 28, 140, 45], text: "Освіжання", align: "center" },
  ]],
  ["Apiaries and Terrariums", "spr_ui_tutorial_apiaries_and_terrariums_2", [
    { ...BLACK_GOLD, region: [60, 66, 135, 80], text: "Довідник меду", align: "center" },
    { ...GREEN, region: [54, 82, 138, 96], text: "4 різні" },
  ]],
  ["Apiaries and Terrariums", "spr_ui_tutorial_apiaries_and_terrariums_3", [
    { ...FADED, region: [54, 5, 138, 20], text: "4 різні" },
    { ...FADED, region: [54, 24, 138, 38], text: "4 звичайні" },
    { ...FADED, region: [54, 43, 138, 57], text: "4 незвичайні" },
    { ...FADED, region: [54, 62, 138, 76], text: "4 рідкісні" },
    { ...GREEN, region: [54, 81, 138, 96], text: "4 легендарні" },
  ]],
  ["Apiaries and Terrariums", "spr_ui_tutorial_apiaries_and_terrariums_4", [
    { ...BLACK_GOLD, region: [62, 44, 130, 58], text: "Довідник предметів", align: "center" },
    { ...FADED, region: [53, 63, 115, 77], text: "4 різні" },
    { ...GREEN, region: [53, 82, 115, 96], text: "4 звичайні" },
  ]],
];

/** Назви мовних спрайтів-карток (без суфікса): гра підставляє `_ukr` замість `_eng` (див. gml/xelanik_fomua.gml). */
export const CARD_SPRITES = CARDS.map(([, name]) => name);

/** Копіює англійські картки як `_ukr` у mod/animations і локалізує їхній текст. */
export function generateCards(assetsDir: string, modDir: string) {
  const root = join(assetsDir, "animations", "UI NEW", "Tutorial Cards");
  for (const [folder, name, edits] of CARDS) {
    const target = join(modDir, "animations", "UI NEW", "Tutorial Cards", folder);
    mkdirSync(target, { recursive: true });
    copyFileSync(join(root, folder, `${name}_eng.png`), join(target, `${name}_ukr.png`));
    const meta = parse(readFileSync(join(root, folder, `${name}_eng.meta.toml`), "utf8")) as { asset_properties: object };
    // У ванільних метафайлах карток поля atlas нема (це окремі текстури), а MOMI пакує новий спрайт лише з atlas і пропускає
    // решту («missing animation metadata»): без нього картка лишається порожньою. Кладемо в атлас UI.
    writeFileSync(
      join(target, `${name}_ukr.meta.toml`),
      stringify({ meta_properties: { asset_kind: "Animation" }, asset_properties: { ...meta.asset_properties, atlas: "UI" } }),
    );
    editCard(assetsDir, join(target, `${name}_ukr.png`), edits);
  }
}

/**
 * Екран завантаження: птах і напис «Loading…» запечені в спрайт, який рушій завантажує сам (тег manual-load) за мовою
 * (en, fr, es, jp, kr, ru, cn, tw). Для мови, якої він не знає, береться англійський. Робимо `_ukr` у надії, що для
 * кодів поза таблицею рушій шукає `<назва>_<код мови>`; якщо ні, спрайт просто не використовується.
 */
export function generateLoadingScreen(assetsDir: string, modDir: string) {
  const sourceDir = join(assetsDir, "animations", "UI NEW", "Loading Screen");
  const targetDir = join(modDir, "animations", "UI NEW", "Loading Screen");
  mkdirSync(targetDir, { recursive: true });
  const target = join(targetDir, "spr_loading_bird_ukr.png");
  copyFileSync(join(sourceDir, "spr_loading_bird_en.png"), target);
  const meta = parse(readFileSync(join(sourceDir, "spr_loading_bird_en.meta.toml"), "utf8")) as { asset_properties: object };
  writeFileSync(
    join(targetDir, "spr_loading_bird_ukr.meta.toml"),
    stringify({ meta_properties: { asset_kind: "Animation" }, asset_properties: meta.asset_properties }),
  );
  editCard(assetsDir, target, [
    { region: [92, 20, 258, 56], inks: [[255, 255, 255]], text: "Завантаження...", color: [255, 255, 255], scale: 2 },
  ]);

  // The vanilla bird + word group is centered over the vine below it; the longer Ukrainian word is not, so shift
  // the whole group (rows above the vine) until its center matches the vine's center.
  const image = readPng(target);
  const splitRow = 56;
  const extent = (from: number, to: number) => {
    let min = Infinity, max = -Infinity;
    for (let y = from; y < to; y++) {
      for (let x = 0; x < image.width; x++) {
        if (image.data[(y * image.width + x) * 4 + 3]! === 0) continue;
        min = Math.min(min, x); max = Math.max(max, x);
      }
    }
    return { min, max };
  };
  const group = extent(0, splitRow);
  const vine = extent(splitRow, image.height);
  const shift = Math.round((vine.min + vine.max) / 2 - (group.min + group.max) / 2);
  if (shift !== 0) {
    for (let y = 0; y < splitRow; y++) {
      const row = image.data.slice(y * image.width * 4, (y + 1) * image.width * 4);
      const moved = new Uint8Array(row.length);
      for (let x = 0; x < image.width; x++) {
        const to = x + shift;
        if (to >= 0 && to < image.width) moved.set(row.subarray(x * 4, x * 4 + 4), to * 4);
      }
      image.data.set(moved, y * image.width * 4);
    }
    writePng(target, image);
  }

  // The startup screen is chosen by the engine itself (bird.rs), which has a fixed language → sprite table with no
  // "ukr" entry and falls back to spr_loading_bird_en. The only way to localize it is to replace that file: same
  // path and the vanilla id, so MOMI overwrites the asset instead of adding a second one.
  copyFileSync(target, join(targetDir, "spr_loading_bird_en.png"));
  const vanilla = parse(readFileSync(join(sourceDir, "spr_loading_bird_en.meta.toml"), "utf8"));
  writeFileSync(join(targetDir, "spr_loading_bird_en.meta.toml"), stringify(vanilla));
}
