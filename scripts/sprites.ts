// Генерація українських версій «запечених» спрайтів з текстом (сезони, дні тижня в HUD і календарі).
// Результат кладеться в mod/animations/… поверх англійських заглушок, які копіює build.ts.
//
// Стиль повторює оригінал: сезони — шрифт birdseed (чорний + рожевий зі зсувом на піксель), дні тижня —
// жирний піксельний шрифт 5 рядків заввишки з чорною чи сірою тінню. Малюється програмно, тож
// будь-який кадр можна потім доправити вручну в графічному редакторі.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openSync } from "fontkit";
import { parse, stringify } from "smol-toml";
import { blank, readPng, writePng } from "./png";
import type { Image } from "./png";

export type Color = [number, number, number];
export type Bitmap = boolean[][]; // [рядок][стовпець]

const BLACK: Color = [0, 0, 0];
const WHITE: Color = [255, 255, 255];
const PINK: Color = [239, 196, 193];
const GRAY: Color = [211, 206, 205];

const SEASONS = ["Весна", "Літо", "Осінь", "Зима"]; // порядок кадрів: Spring, Summer, Fall, Winter
// Тиждень у грі починається з понеділка (кадри HUD і календаря); екран підсумку дня — з неділі.
const WEEKDAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "НД"];

// Жирний шрифт 5 рядків: вертикалі 2 пікселі, як в оригіналі.
const GLYPHS: Record<string, string[]> = {
  "П": ["#####", "##.##", "##.##", "##.##", "##.##"],
  "Н": ["##.##", "##.##", "#####", "##.##", "##.##"],
  "В": ["####.", "##.##", "####.", "##.##", "####."],
  "Т": ["######", "..##..", "..##..", "..##..", "..##.."],
  "С": [".####", "##...", "##...", "##...", ".####"],
  "Р": ["####.", "##.##", "####.", "##...", "##..."],
  "Ч": ["##.##", "##.##", ".####", "...##", "...##"],
  "Б": ["#####", "##...", "####.", "##.##", "####."],
  "Д": [".####.", ".#..#.", ".#..#.", "######", "##..##"],
};

export function glyphBitmap(text: string, gap = 1): Bitmap {
  const rows: string[] = Array.from({ length: 5 }, () => "");
  [...text].forEach((char, index) => {
    const glyph = GLYPHS[char];
    if (!glyph) throw new Error(`Немає гліфа «${char}» у жирному шрифті`);
    for (let y = 0; y < 5; y++) rows[y] += (index > 0 ? ".".repeat(gap) : "") + glyph[y];
  });
  return rows.map((row) => [...row].map((cell) => cell === "#"));
}

export function scaleBitmap(bitmap: Bitmap, sx: number, sy: number): Bitmap {
  return bitmap.flatMap((row) => {
    const wide = row.flatMap((cell) => Array<boolean>(sx).fill(cell));
    return Array.from({ length: sy }, () => wide);
  });
}

export function paint(image: Image, bitmap: Bitmap, x0: number, y0: number, color: Color) {
  bitmap.forEach((row, y) =>
    row.forEach((on, x) => {
      const px = x0 + x;
      const py = y0 + y;
      if (!on || px < 0 || py < 0 || px >= image.width || py >= image.height) return;
      const i = (py * image.width + px) * 4;
      image.data.set([...color, 255], i);
    }),
  );
}

/** Малює кадр (frameX — зсув кадру в смузі) із тінню; тінь лежить під літерами. */
function drawShadowed(image: Image, frameX: number, bitmap: Bitmap, x: number, y: number, fill: Color, shadow: Color, shadowDx: number, shadowDy: number) {
  paint(image, bitmap, frameX + x + shadowDx, y + shadowDy, shadow);
  paint(image, bitmap, frameX + x, y, fill);
}

export const width = (bitmap: Bitmap) => bitmap[0]?.length ?? 0;

// ---------- Сезони: шрифт birdseed ----------

export function rasterize(fontPath: string, text: string): { bitmap: Bitmap; capTop: number } {
  const font = openSync(fontPath);
  if (!("unitsPerEm" in font)) throw new Error("очікувався один шрифт");
  const size = 16; // 1 піксель шрифту = 128 одиниць = 1 піксель екрана
  const scale = size / font.unitsPerEm;

  const render = (value: string) => {
    const run = font.layout(value);
    const cols = Math.ceil(run.advanceWidth * scale) + 2;
    const rows = Math.ceil((font.ascent - font.descent) * scale) + 2;
    const grid: Bitmap = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
    let pen = 0;
    run.glyphs.forEach((glyph, i) => {
      const polygons: [number, number][][] = [];
      let current: [number, number][] = [];
      for (const command of glyph.path.commands) {
        const args = command.args as number[];
        if (command.command === "moveTo") {
          if (current.length) polygons.push(current);
          current = [[args[0]!, args[1]!]];
        } else if (command.command === "closePath") {
          if (current.length) polygons.push(current);
          current = [];
        } else current.push([args[args.length - 2]!, args[args.length - 1]!]);
      }
      if (current.length) polygons.push(current);
      for (let y = 0; y < rows; y++) {
        const fy = font.ascent - (y + 0.5) / scale;
        for (let x = 0; x < cols; x++) {
          const fx = (x + 0.5) / scale - (pen + run.positions[i]!.xOffset);
          let inside = false;
          for (const polygon of polygons) {
            polygon.forEach(([x1, y1], k) => {
              const [x2, y2] = polygon[(k + 1) % polygon.length]!;
              if (y1 > fy !== y2 > fy && fx < ((x2 - x1) * (fy - y1)) / (y2 - y1) + x1) inside = !inside;
            });
          }
          if (inside) grid[y]![x] = true;
        }
      }
      pen += run.positions[i]!.xAdvance;
    });
    return grid;
  };

  const trimColumns = (grid: Bitmap) => {
    const used = grid[0]!.map((_, x) => grid.some((row) => row[x]));
    const first = used.indexOf(true);
    const last = used.lastIndexOf(true);
    return grid.map((row) => row.slice(first, last + 1));
  };
  const firstRow = (grid: Bitmap) => grid.findIndex((row) => row.some(Boolean));

  const grid = render(text);
  return { bitmap: trimColumns(grid), capTop: firstRow(render("Н")) };
}

function generateSeasons(assetsDir: string, target: string) {
  const source = readPng(target);
  const frameW = source.width / 4;
  const out = blank(source.width, source.height);
  const fontPath = join(assetsDir, "fonts", "fnt_mistria_birdseed.ttf");
  SEASONS.forEach((name, index) => {
    const { bitmap, capTop } = rasterize(fontPath, name);
    const x = Math.floor((frameW - width(bitmap) - 1) / 2);
    // Верх прописних літер — на 4-му рядку кадру, як в оригіналі.
    const y = 3 - capTop;
    // У грі плашка під назвою сезону рожева, тож рожевий шар оригіналу на ній зникає й лишаються
    // уривки чорного — для кирилиці це нечитабельно. Тому літери суцільно чорні, а рожева тінь лежить
    // під ними (потовщення на піксель зливає внутрішні проміжки літер, як у «м» чи «ь»).
    const left = index * frameW + x;
    paint(out, bitmap, left + 1, y + 1, PINK);
    paint(out, bitmap, left, y, BLACK);
  });
  writePng(target, out);
}

// ---------- Дні тижня ----------

function generateHudWeekdays(target: string) {
  const source = readPng(target);
  const frameW = source.width / 7;
  const out = blank(source.width, source.height);
  WEEKDAYS.forEach((day, index) => {
    const bitmap = glyphBitmap(day);
    const x = Math.floor((frameW - width(bitmap) - 1) / 2);
    drawShadowed(out, index * frameW, bitmap, x, 3, WHITE, BLACK, 1, 1);
  });
  writePng(target, out);
}

function generateEndOfDayWeekdays(target: string) {
  const source = readPng(target);
  const frameW = source.width / 7;
  const out = blank(source.width, source.height);
  // Кадри починаються з неділі: НД ПН ВТ СР ЧТ ПТ СБ
  const order = [WEEKDAYS[6]!, ...WEEKDAYS.slice(0, 6)];
  order.forEach((day, index) => {
    const bitmap = scaleBitmap(glyphBitmap(day, 1), 3, 2);
    const x = Math.floor((frameW - width(bitmap) - 1) / 2);
    drawShadowed(out, index * frameW, bitmap, x, 8, WHITE, BLACK, 1, 2);
  });
  writePng(target, out);
}

function generateCalendar(target: string) {
  const image = readPng(target);
  const frameW = 25;
  const frames = image.width / frameW;
  for (let frame = 0; frame < frames; frame++) {
    const left = frame * frameW;
    // Очищаємо смугу з англійським написом (рядки 23–28, всередині рамки) фоном аркуша.
    const bg = (y: number) => {
      const i = (y * image.width + left + 5) * 4;
      return [image.data[i]!, image.data[i + 1]!, image.data[i + 2]!] as Color;
    };
    const paper = bg(22);
    for (let y = 23; y <= 28; y++) {
      for (let x = 1; x <= frameW - 2; x++) image.data.set([...paper, 255], (y * image.width + left + x) * 4);
    }
    const bitmap = glyphBitmap(WEEKDAYS[frame % 7]!);
    const x = Math.floor((frameW - width(bitmap) - 1) / 2);
    drawShadowed(image, left, bitmap, x, 23, BLACK, GRAY, 1, 1);
  }
  writePng(target, image);
}

// ---------- Дрібні спрайти, намальовані з нуля (жодного пікселя з гри) ----------
// Береться лише розмір кадру з заглушки; малюнок і розкладка анімації — власні.

const bitmapOf = (rows: string[]): Bitmap => rows.map((row) => [...row].map((cell) => cell !== "."));

/** Кладе бітмапи в ряд із проміжком gap, починаючи з (x0, y0). */
function paintRow(image: Image, items: Bitmap[], x0: number, y0: number, gap: number, color: Color) {
  let x = x0;
  for (const item of items) {
    paint(image, item, x, y0, color);
    x += width(item) + gap;
  }
}

/** «РІВ.» шрифтом заввишки 3 пікселі (в оригіналі «LVL.»). */
export function lvlBitmap(): Bitmap {
  const letters = [["##", "##", "#."], ["#", "#", "#"], ["##.", "###", "##."], [".", ".", "#"]].map(bitmapOf);
  return [0, 1, 2].map((row) => letters.flatMap((letter, i) => [...(i > 0 ? [false] : []), ...letter[row]!]));
}

function generateLvl(target: string) {
  const source = readPng(target);
  const out = blank(source.width, source.height);
  paint(out, lvlBitmap(), 0, 1, WHITE);
  writePng(target, out);
}

// Іконка кухні (каструля на вогні) і підпис «РІВ»: чорні штрихи заввишки 6 пікселів, світла тінь праворуч і знизу.
const KITCHEN_ICON = [
  "..........",
  "....##....",
  "..######..",
  ".#cccccc#.",
  "##########",
  "#cggggggd#",
  "#cggggggd#",
  "#cggggggd#",
  "#dddddddd#",
  ".########.",
  "..oyoyoy..",
  "...oyyo...",
];
const KITCHEN_COLORS: Record<string, Color> = {
  "#": [3, 4, 1],
  c: [221, 203, 218],
  g: [172, 171, 187],
  d: [109, 108, 123],
  o: [245, 140, 65],
  y: [243, 201, 103],
};
const KITCHEN_TEXT_SHADE: Color = [221, 203, 218];

/** Підпис «РІВ» у стилі плашки кухні (лівий верхній кут (x0, y0)): чорні штрихи заввишки 6 пікселів і світла тінь праворуч-вниз. */
export function paintKitchenLabel(image: Image, x0: number, y0: number) {
  const letters = [
    ["###.", "#..#", "#..#", "###.", "#...", "#..."],
    ["#", "#", "#", "#", "#", "#"],
    ["###.", "#..#", "###.", "#..#", "#..#", "###."],
  ].map(bitmapOf);
  const mask = blank(image.width, image.height);
  paintRow(mask, letters, x0, y0, 1, WHITE);
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < mask.width && y < mask.height && mask.data[(y * mask.width + x) * 4 + 3] !== 0;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (!on(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        if (!on(x + dx, y + dy) && x + dx < image.width && y + dy < image.height) image.data.set([...KITCHEN_TEXT_SHADE, 255], ((y + dy) * image.width + x + dx) * 4);
      }
    }
  }
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) if (on(x, y)) image.data.set([...BLACK, 255], (y * image.width + x) * 4);
}

function generateKitchenLevel(target: string) {
  const source = readPng(target);
  const out = blank(source.width, source.height);
  KITCHEN_ICON.forEach((row, y) =>
    [...row].forEach((cell, x) => {
      const color = KITCHEN_COLORS[cell];
      if (color) out.data.set([...color, 255], (y * out.width + x) * 4);
    }),
  );
  paintKitchenLabel(out, 12, 3);
  writePng(target, out);
}

// Плашка меню кулінарії: підпис «Lvl» запечений у спрайт поруч із іконкою кухні. Копіюємо оригінал як `_ukr` і міняємо
// лише підпис (x 229–240, y 120–126 на плашці-пігулці кольору (249,237,248)); решта — оригінальний арт гри.
// Гра бере плашку з fiddle/ui/crafting/cooking.toml без мовного суфікса, тож підміну робить GML (xelanik_fomua.gml).
function generateCookingBackplate(assetsDir: string, modDir: string) {
  const sourceDir = join(assetsDir, "animations", "UI NEW", "Crafting", "Cooking");
  const targetDir = join(modDir, "animations", "UI NEW", "Crafting", "Cooking");
  mkdirSync(targetDir, { recursive: true });
  const target = join(targetDir, "spr_ui_cooking_backplate_ukr.png");
  copyFileSync(join(sourceDir, "spr_ui_cooking_backplate.png"), target);
  const meta = parse(readFileSync(join(sourceDir, "spr_ui_cooking_backplate.meta.toml"), "utf8")) as { asset_properties: object };
  writeFileSync(
    join(targetDir, "spr_ui_cooking_backplate_ukr.meta.toml"),
    stringify({ meta_properties: { asset_kind: "Animation" }, asset_properties: meta.asset_properties }),
  );
  const image = readPng(target);
  for (let y = 120; y <= 126; y++) {
    for (let x = 229; x <= 241; x++) image.data.set([249, 237, 248, 255], (y * image.width + x) * 4);
  }
  paintKitchenLabel(image, 229, 120);
  writePng(target, image);
}

// «КРИТ»: білі літери з чорним контуром з'являються по черзі й підстрибують; 6 кадрів по 23×20, останній — спокій.
function generateCrit(target: string) {
  const source = readPng(target);
  const frameWidth = 23;
  const frames = Math.round(source.width / frameWidth);
  const out = blank(source.width, source.height);
  const letters = [
    ["#..#", "#.#.", "##..", "##..", "##..", "#.#.", "#..#"],
    ["###.", "#..#", "#..#", "###.", "#...", "#...", "#..."],
    ["#..#", "#.##", "#.##", "##.#", "##.#", "#..#", "#..#"],
    ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  ].map(bitmapOf);
  // Зсув кожної літери по вертикалі (позитивний — нижче): літера «вистрибує» знизу.
  const dropByFrame = [[3], [0, 3], [0, 0, 3], [0, 0, 0, 3], [0, 0, 0, -1], [0, 0, 0, 0]];
  for (let frame = 0; frame < frames; frame++) {
    const canvas = blank(frameWidth, source.height);
    let x = 1;
    (dropByFrame[Math.min(frame, dropByFrame.length - 1)] ?? []).forEach((drop, i) => {
      paint(canvas, letters[i]!, x, 3 + drop, WHITE);
      x += width(letters[i]!) + 1;
    });
    const filled = (px: number, py: number) => px >= 0 && py >= 0 && px < canvas.width && py < canvas.height && canvas.data[(py * canvas.width + px) * 4 + 3] !== 0;
    for (let py = 0; py < canvas.height; py++) {
      for (let px = 0; px < canvas.width; px++) {
        const i = (py * canvas.width + px) * 4;
        const at = (py * out.width + frame * frameWidth + px) * 4;
        if (filled(px, py)) out.data.set(canvas.data.subarray(i, i + 4), at);
        else if ([-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => filled(px + dx, py + dy)))) out.data.set([...BLACK, 255], at);
      }
    }
  }
  writePng(target, out);
}

/** Перемальовує українські версії поверх заглушок у mod/animations. */
export function generateSprites(assetsDir: string, modDir: string) {
  const fonts = join(modDir, "animations", "UI NEW", "Fonts", "Baked Text Assets");
  generateSeasons(assetsDir, join(fonts, "spr_ui_hud_season_name_baked_text_ukr.png"));
  generateHudWeekdays(join(fonts, "spr_ui_hud_font_calendar_weekdays_ukr.png"));
  generateEndOfDayWeekdays(join(modDir, "animations", "UI NEW", "Calendar", "spr_ui_endoftheday_calendar_weekdays_ukr.png"));
  for (const season of ["spring", "summer", "fall", "winter"]) {
    generateCalendar(join(fonts, `spr_ui_hud_calendar_baked_text_ukr_${season}.png`));
  }
  generateLvl(join(fonts, "spr_ui_skills_lvl_ukr.png"));
  generateKitchenLevel(join(modDir, "animations", "UI NEW", "Generic", "spr_ui_tooltip_icon_kitchen_level_ukr.png"));
  generateCrit(join(modDir, "animations", "Effects", "spr_fx_crit_ukr.png"));
  generateCookingBackplate(assetsDir, modDir);
}
