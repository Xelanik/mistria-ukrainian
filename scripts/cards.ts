// Картки туторіалів: міні-скриншоти гри з англійським текстом її шрифтом. Для кожного рядка знаходимо його рамку за
// кольором тексту, витираємо (заливка кольором тла ліворуч у кожному рядку) і малюємо український текст тим самим
// шрифтом на тому самому місці. Решта картки — оригінальний арт гри (змінений спрайт).

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "smol-toml";
import { readPng, writePng } from "./png";
import { glyphBitmap, lvlBitmap, rasterize, scaleBitmap, width } from "./sprites";
import type { Bitmap, Color } from "./sprites";

type Edit = {
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
  /** Збільшити текст у стільки разів. */
  scale?: number;
  /** Не малювати правіше за цей x (панель обрізана краєм картки). */
  clipRight?: number;
  /** Відкидати літери й слова, що не вміщаються цілком (за замовчуванням обрізаємо піксельно). */
  trim?: boolean;
  /** Абсолютний x лівого краю тексту (замість знайденого місця старого тексту). */
  x?: number;
  /** Не малювати вище за цей y (верх тексту сховано під верхньою рамкою картки). */
  clipTop?: number;
  /** Не малювати лівіше за цей x (текст обрізано лівим краєм картки). */
  clipLeft?: number;
  color: Color;
  /** Колір тіні (на піксель праворуч-вниз); без нього тіні нема. */
  shadow?: Color;
  /** Колір заливки; без нього береться піксель ліворуч від рамки в кожному рядку. */
  fill?: Color;
};

function editCard(assetsDir: string, path: string, edits: Edit[]) {
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
      for (let x = Math.max(xmin - 1, 3); x <= Math.min(xmax + 1, image.width - 4); x++) {
        // Всередині рамки тексту стираємо все; на 1 піксель довкола - тінь і світлі рештки літер, але не темну рамку панелі.
        const inside = x >= xmin && x <= xmax && y >= ymin && y <= ymax;
        if (!inside) {
          const [r, g, b] = pixel(x, y);
          const isShadow = !!edit.shadow && edit.shadow[0] === r && edit.shadow[1] === g && edit.shadow[2] === b;
          if (!isShadow && r + g + b < 200) continue;
        }
        image.data.set([...(alpha === 0 ? [0, 0, 0] : fill), alpha], at(x, y));
      }
    }
  });

  const drawn: { left: number; width: number }[] = [];
  edits.forEach((edit, i) => {
    const { xmin, xmax, ymin } = found[i]!;
    if (!edit.text) return;
    const font = edit.font ?? "game";
    let bitmap: Bitmap;
    let capTop = 0;
    let text = edit.text;
    const render = (t: string) => {
      if (font === "bold") return { bitmap: glyphBitmap(t), capTop: 0 };
      if (font === "lvl") return { bitmap: lvlBitmap(), capTop: 0 };
      return rasterize(fontPath, t);
    };
    const place = (t: string, w: number) => {
      let at0: number;
      if (edit.x !== undefined) at0 = edit.x;
      else if (edit.after !== undefined) at0 = drawn[edit.after]!.left + drawn[edit.after]!.width + (edit.gap ?? 4);
      else if (edit.align === "center") {
        const wasWidth = edit.was ? width(font === "bold" ? glyphBitmap(edit.was) : rasterize(fontPath, edit.was).bitmap) : xmax + 1 - xmin;
        at0 = Math.round(xmin + (wasWidth - w) / 2);
      } else if (edit.align === "right") at0 = xmax + 1 - w;
      else at0 = xmin;
      return at0 + (edit.dx ?? 0);
    };
    // Текст, обрізаний краєм панелі, не повинен лишати напівлітер: відкидаємо літери, що не вміщаються цілком.
    // Права межа тримає кінець рядка (відкидаємо початок), ліва - початок (відкидаємо кінець).
    let clippedLeft: number | undefined;
    if (edit.trim && font === "game" && (edit.clipLeft !== undefined || edit.clipRight !== undefined)) {
      const total = width(render(text).bitmap);
      const startLeft = place(text, total);
      while (edit.clipLeft !== undefined && text.length > 1) {
        const w = width(render(text).bitmap);
        if (startLeft + (total - w) >= edit.clipLeft) break;
        text = text.slice(1).trimStart();
      }
      const lead = total - width(render(text).bitmap);
      const before = text;
      while (edit.clipRight !== undefined && text.length > 1) {
        const w = width(render(text).bitmap);
        if (startLeft + lead + w - 1 <= edit.clipRight) break;
        text = text.slice(0, -1).trimEnd();
      }
      // Обрізаємо по слову, а не посеред слова (якщо після цього лишається хоч одне слово).
      if (text !== before && before[text.length] !== " " && text.includes(" ")) text = text.slice(0, text.lastIndexOf(" ")).trimEnd();
      clippedLeft = startLeft + lead;
    }
    ({ bitmap, capTop } = render(text));
    if (edit.scale && edit.scale > 1) {
      bitmap = scaleBitmap(bitmap, edit.scale, edit.scale);
      capTop *= edit.scale;
    }
    const w = width(bitmap);
    const left = clippedLeft ?? place(text, w);
    const top = (edit.top ?? ymin) - capTop + (edit.dy ?? 0);
    drawn.push({ left, width: w });
    const put = (ox: number, oy: number, color: Color) =>
      bitmap.forEach((row, y) =>
        row.forEach((on, x) => {
          const px = left + ox + x;
          const py = top + oy + y;
          if (!on || px < (edit.clipLeft ?? 0) || py < (edit.clipTop ?? 0) || px >= image.width || py >= image.height || px > (edit.clipRight ?? image.width)) return;
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
/** Чорнило тексту меню на картках створення: у ковальстві й кулінарії воно (1,1,1), в інших місцях (0,0,0). */
const INK1 = { inks: [[1, 1, 1]] as Color[], color: [1, 1, 1] as Color };
const INK0 = { inks: [[0, 0, 0]] as Color[], color: [0, 0, 0] as Color };
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
    { ...BLACK_PINK, region: [53, 7, 91, 18], text: "Магічні закляття", align: "center", was: "Magic Spells", clipRight: 90 },
    { ...BLACK_CREAM, region: [26, 32, 91, 47], text: "Відновлення", clipRight: 90, fill: CREAM },
    { ...BLACK_CREAM, region: [26, 71, 91, 88], text: "Ріст", clipRight: 90, fill: [255, 255, 255] },
  ]],
  ["Magic", "spr_ui_tutorial_magic_4", [
    { ...BLACK_CREAM, region: [20, 4, 80, 18], text: "Назва", align: "center" },
    { ...BLACK_CREAM, region: [10, 20, 90, 34], text: "Відновлення", align: "center" },
    { ...BLACK_CREAM, region: [30, 40, 70, 52], text: "Тип", align: "center" },
    { ...BLACK_CREAM, region: [20, 58, 80, 70], text: "Лікування", align: "center" },
    { ...BLACK_CREAM, region: [30, 76, 70, 85], text: "Вартість", align: "center" },
  ]],
  ["Mines", "spr_ui_tutorial_mines_6", [
    { ...BLACK_CREAM, region: [107, 3, 172, 13], text: "Ранг міста:", top: 1, clipTop: 3, clipRight: 184 },
    { ...GREEN, region: [173, 3, 186, 12], text: "Мідь", top: 1, clipTop: 3, after: 0, gap: 4, clipRight: 184 },
    { ...BLACK_PINK, region: [150, 19, 184, 34], text: "Спорядження", align: "center", was: "Equipment", clipRight: 184 },
    { ...BLACK_PINK, region: [160, 72, 184, 86], text: "Навички", align: "center", was: "Skills", clipRight: 184 },
  ]],
  ["Mines", "spr_ui_tutorial_mines_7", [
    { ...WHITE_BLUE, region: [120, 9, 160, 19], text: "Навички", align: "center" },
    { ...LVL, region: [104, 81, 120, 87] },
    { ...LVL, region: [153, 81, 169, 87] },
  ]],
  ["Ranching", "spr_ui_tutorial_ranching_1", [
    { ...BLACK_PINK, region: [150, 8, 186, 22], text: "Курка", align: "center", was: "Chicken", clipRight: 184 },
    { ...BLACK_CREAM, region: [115, 38, 170, 52], text: "Коричнева" },
    { ...BLACK_CREAM, region: [115, 76, 175, 90], text: "Ряба" },
  ]],
  ["Skill Perks", "spr_ui_tutorial_skill_perks_2", [
    { ...WHITE_BLUE, region: [100, 9, 150, 19], text: "Навички", align: "center" },
    { ...LVL, region: [94, 88, 108, 96] },
    { ...LVL, region: [141, 88, 155, 96] },
  ]],
  ["Skill Perks", "spr_ui_tutorial_skill_perks_3", [
    { ...BLACK_PINK, region: [60, 16, 130, 28], text: "Відновлення", align: "center" },
    { ...BLACK_CREAM, region: [36, 50, 165, 63], text: "Поливання культури" },
    { ...BLACK_CREAM, region: [36, 64, 165, 76], text: "іноді повертає" },
    { ...BLACK_CREAM, region: [36, 77, 165, 90], text: "витрачену витривалість." },
  ]],
  ["Skill Perks", "spr_ui_tutorial_skill_perks_4", [
    { ...WHITE_BLUE, region: [5, 4, 70, 20], text: "Землеробство", x: -4, clipLeft: 5 },
    { ...WHITE_BLUE, region: [70, 28, 140, 45], text: "Відновлення", align: "center" },
  ]],
  // Музей: картки одномовні (без суфікса _eng), текст - з інтерфейсу гри.
  ["Museum", "spr_ui_tutorial_museum_2", [
    { inks: [[1, 1, 1]], color: [1, 1, 1], shadow: [196, 123, 142], region: [100, 52, 139, 66], text: "Віддати", dx: -2 },
  ]],
  ["Museum", "spr_ui_tutorial_museum_3", [
    { ...BLACK_PINK, shadow: [204, 151, 166], region: [40, 6, 150, 22], text: "Весняні квіти", align: "center" },
    { ...BLACK_CREAM, shadow: [208, 191, 205], region: [8, 72, 180, 83], text: "Колекція квітів,", align: "center" },
    { ...BLACK_CREAM, shadow: [208, 191, 205], region: [8, 84, 180, 95], text: "що ростуть навесні.", align: "center" },
  ]],
  ["Museum", "spr_ui_tutorial_museum_4", [
    { ...BLACK_GOLD, shadow: [190, 127, 60], region: [94, 6, 184, 18], text: "Нагорода набору", align: "center" },
  ]],
  ["Museum", "spr_ui_tutorial_museum_5", [
    { ...BLACK_PINK, shadow: [204, 151, 166], region: [26, 8, 70, 24], text: "Глина" },
    { ...BLACK_CREAM, shadow: [208, 191, 205], region: [8, 46, 176, 57], text: "Невелика грудка глини." },
    { ...BLACK_CREAM, shadow: [208, 191, 205], region: [8, 58, 176, 69], text: "Використовується в багатьох" },
    { ...BLACK_CREAM, shadow: [208, 191, 205], region: [8, 58, 176, 69], text: "рецептах створення.", dy: 12 },
  ]],
  // Створення: підписи меню й фрагменти тексту, обрізані краєм картки.
  ["Crafting", "spr_ui_tutorial_crafting_2", [
    { inks: [[0, 0, 0]], color: [0, 0, 0], shadow: [207, 161, 148], region: [34, 33, 62, 46], text: "Набори" },
    { inks: [[0, 0, 0]], color: [0, 0, 0], shadow: [221, 203, 218], region: [34, 52, 165, 66], text: "Стартовий набір ферми" },
  ]],
  ["Crafting", "spr_ui_tutorial_crafting_3", [
    { inks: [[0, 0, 0]], color: [0, 0, 0], shadow: [221, 203, 218], region: [58, 4, 90, 14], text: "Пташиний будиночок", clipRight: 85 },
    { inks: [[52, 131, 107]], color: [52, 131, 107], shadow: [221, 203, 218], region: [110, 66, 150, 84], text: "30 хв" },
    { inks: [[56, 31, 36]], color: [56, 31, 36], shadow: [228, 170, 156], region: [160, 76, 186, 92], text: "ок", clipRight: 184 },
  ]],
  ["Crafting", "spr_ui_tutorial_crafting_4", [
    { inks: [[0, 0, 0]], color: [0, 0, 0], shadow: [221, 203, 218], region: [3, 10, 34, 21], text: "Дикі птахи", align: "right", clipLeft: 3, fill: [248, 236, 247] },
    { inks: [[0, 0, 0]], color: [0, 0, 0], shadow: [221, 203, 218], region: [3, 22, 34, 33], text: "сидіти на ньому.", align: "right", clipLeft: 3, fill: [248, 236, 247] },
    { inks: [[52, 131, 107]], color: [52, 131, 107], shadow: [221, 203, 218], region: [2, 60, 24, 76], text: "хв", align: "right", clipLeft: 3, fill: [247, 235, 246] },
    { inks: [[56, 31, 36]], color: [56, 31, 36], shadow: [228, 170, 156], region: [40, 66, 62, 84], text: "ок" },
  ]],
  // Меню створення на картках ковальства, кулінарії й млина: картки - вирізки зі скриншота гри, тому текст, обрізаний
  // краєм вирізки, малюємо так само: справжній текст гри, що тече під рамку картки.
  ["Blacksmithing", "spr_ui_tutorial_blacksmithing_2", [
    { ...INK1, shadow: [166, 172, 198], region: [34, 35, 90, 45], text: "Усі предмети" },
    { ...INK1, shadow: [214, 202, 210], region: [34, 52, 100, 66], text: "Злитки" },
  ]],
  ["Blacksmithing", "spr_ui_tutorial_blacksmithing_3", [
    { ...INK1, shadow: [214, 202, 210], region: [56, 3, 92, 15], text: "Мідний злиток", clipRight: 90 },
    { inks: [[48, 122, 101]], color: [48, 122, 101], shadow: [207, 190, 204], region: [110, 66, 160, 84], text: "10 хв" },
    { inks: [[103, 107, 122]], color: [103, 107, 122], shadow: [145, 152, 169], region: [168, 78, 184, 90], text: "ок", clipRight: 184 },
  ]],
  ["Blacksmithing", "spr_ui_tutorial_blacksmithing_4", [
    { ...INK1, shadow: [214, 202, 210], region: [3, 6, 58, 17], text: "Злиток суцільної міді. Потрібен", align: "right", clipLeft: 3, fill: [235, 223, 234] },
    { ...INK1, shadow: [214, 202, 210], region: [3, 18, 58, 29], text: "для ковальських рецептів і", align: "right", clipLeft: 3, fill: [235, 223, 234] },
    { ...INK1, shadow: [214, 202, 210], region: [3, 30, 58, 40], text: "створення.", align: "right", clipLeft: 3, fill: [235, 223, 234] },
    { inks: [[48, 122, 101]], color: [48, 122, 101], shadow: [207, 190, 204], region: [3, 60, 24, 74], text: "хв", align: "right", clipLeft: 3, fill: [234, 222, 233] },
    { inks: [[35, 35, 53]], color: [35, 35, 53], shadow: [165, 180, 204], region: [40, 66, 62, 84], text: "ок" },
  ]],
  ["Cooking", "spr_ui_tutorial_cooking_2", [
    { ...INK1, shadow: [230, 175, 189], region: [36, 33, 125, 44], text: "Основні страви" },
    { ...INK1, shadow: [214, 202, 210], region: [36, 52, 125, 63], text: "Ручна робота" },
  ]],
  ["Cooking", "spr_ui_tutorial_cooking_3", [
    { ...INK1, shadow: [214, 202, 210], region: [50, 3, 96, 14], text: "В'ялений кальмар", clipRight: 90 },
    { inks: [[3, 4, 1]], color: [3, 4, 1], shadow: [207, 190, 204], region: [112, 28, 125, 38], text: "Рів." },
    { inks: [[46, 115, 95]], color: [46, 115, 95], shadow: [207, 190, 204], region: [126, 28, 134, 38], text: "2", after: 1, gap: 3 },
    { inks: [[48, 122, 101]], color: [48, 122, 101], shadow: [207, 190, 204], region: [110, 68, 152, 84], text: "10 хв" },
    { inks: [[52, 28, 33]], color: [52, 28, 33], shadow: [203, 151, 166], region: [166, 78, 184, 90], text: "ок", clipRight: 184 },
  ]],
  ["Cooking", "spr_ui_tutorial_cooking_4", [
    { ...INK1, shadow: [214, 202, 210], region: [3, 6, 60, 18], text: "Цей смачний в'ялений кальмар -", align: "right", clipLeft: 3, fill: [235, 223, 234] },
    { ...INK1, shadow: [214, 202, 210], region: [3, 19, 60, 32], text: "популярна закуска на узбережжі.", align: "right", clipLeft: 3, fill: [235, 223, 234] },
    { inks: [[48, 122, 101]], color: [48, 122, 101], shadow: [207, 190, 204], region: [3, 58, 24, 76], text: "хв", align: "right", clipLeft: 3, fill: [234, 222, 233] },
    { inks: [[53, 29, 34]], color: [53, 29, 34], shadow: [229, 171, 182], region: [38, 70, 62, 84], text: "ок" },
  ]],
  ["Elsie Gossip", "spr_ui_tutorial_elsie_gossip_2", [
    { ...INK0, shadow: [227, 176, 136], region: [3, 84, 28, 98], text: "нок", align: "right", clipLeft: 3, fill: [251, 220, 160] },
    { ...INK0, shadow: [227, 176, 136], region: [60, 84, 125, 96], text: "Вподобане", align: "center" },
    { ...INK0, shadow: [225, 99, 115], region: [156, 86, 186, 96], text: "Улюблене", clipRight: 184 },
  ]],
  ["Elsie Gossip", "spr_ui_tutorial_elsie_gossip_3", [
    { ...INK0, shadow: [221, 203, 218], region: [95, 28, 175, 44], text: "Вподобані", align: "center" },
  ]],
  ["Elsie Gossip", "spr_ui_tutorial_elsie_gossip_4", [
    { ...INK0, shadow: [221, 203, 218], region: [95, 28, 175, 44], text: "Вподобані", align: "center" },
  ]],
  ["Milling", "spr_ui_tutorial_milling_2", [
    { ...INK0, shadow: [221, 183, 160], region: [34, 34, 120, 44], text: "Усі предмети" },
    { ...INK0, shadow: [208, 191, 205], region: [34, 52, 120, 64], text: "Корм для тварин" },
  ]],
  ["Milling", "spr_ui_tutorial_milling_3", [
    { ...INK0, shadow: [208, 191, 205], region: [20, 3, 90, 14], text: "Розкішний корм для великих тварин", dy: 2, clipRight: 90 },
    { inks: [[49, 123, 101]], color: [49, 123, 101], shadow: [208, 191, 205], region: [130, 66, 166, 77], text: "30 хв" },
    { ...INK0, shadow: [208, 191, 205], region: [94, 12, 184, 25], text: "Розкішний корм для великих", align: "right", clipLeft: 94, clipRight: 184, fill: [233, 221, 232] },
    { ...INK0, shadow: [208, 191, 205], region: [94, 25, 184, 37], text: "класти в годівниці хліва", align: "right", dx: 8, clipLeft: 94, clipRight: 184, fill: [233, 221, 232] },
    { ...INK0, shadow: [208, 191, 205], region: [94, 37, 184, 50], text: "або годувати з рук.", align: "right", clipLeft: 94, clipRight: 184, fill: [233, 221, 232] },
  ]],
  ["Milling", "spr_ui_tutorial_milling_4", [
    { ...INK0, shadow: [208, 191, 205], region: [3, 10, 20, 19], text: "великих", dy: -2, align: "right", clipLeft: 3, fill: [233, 221, 232] },
    { ...INK0, shadow: [208, 191, 205], region: [3, 20, 50, 31], text: "класти в", align: "right", clipLeft: 3, fill: [233, 221, 232] },
    { ...INK0, shadow: [208, 191, 205], region: [3, 33, 44, 43], text: "годувати з рук.", align: "right", clipLeft: 3, fill: [233, 221, 232] },
    { inks: [[49, 123, 101]], color: [49, 123, 101], shadow: [208, 191, 205], region: [3, 60, 30, 72], text: "хв", align: "right", clipLeft: 3, fill: [234, 222, 233] },
    { inks: [[53, 29, 34]], color: [53, 29, 34], shadow: [221, 183, 160], region: [40, 68, 62, 80], text: "ок" },
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
    // Картки з мовними варіантами мають суфікс _eng; одномовні (музей, створення...) - просто назву.
    const source = existsSync(join(root, folder, `${name}_eng.png`)) ? `${name}_eng` : name;
    copyFileSync(join(root, folder, `${source}.png`), join(target, `${name}_ukr.png`));
    const meta = parse(readFileSync(join(root, folder, `${source}.meta.toml`), "utf8")) as { asset_properties: object };
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
 * Стартова заставка: птах і напис «Loading…» запечені в `spr_loading_bird_en`. Рушій сам обирає спрайт за власною
 * таблицею мов (bird.rs) без запису для «ukr» і береться за англійський, тож єдиний спосіб - перекрити саме його:
 * той самий шлях і ванільний id (replace_id змушує MOMI прибрати ванільний запис атласу). Автономний PNG, який і
 * читає рушій (тег manual-load), пише в assets.zip лише MOMI 0.17.0+ («Installed named sprite»); стара версія
 * оновить лише атлас, і заставка лишиться англійською. Побічний ефект: англомовні гравці з модом теж побачать
 * «Завантаження...».
 */
export function generateLoadingScreen(assetsDir: string, modDir: string) {
  const sourceDir = join(assetsDir, "animations", "UI NEW", "Loading Screen");
  const targetDir = join(modDir, "animations", "UI NEW", "Loading Screen");
  mkdirSync(targetDir, { recursive: true });
  const target = join(targetDir, "spr_loading_bird_en.png");
  copyFileSync(join(sourceDir, "spr_loading_bird_en.png"), target);
  editCard(assetsDir, target, [
    { region: [92, 20, 258, 56], inks: [[255, 255, 255]], text: "Завантаження...", color: [255, 255, 255], scale: 2 },
  ]);

  // Птах і слово центровані над лозою під ними; довше українське слово - ні, тож зсуваємо всю групу (рядки над
  // лозою), поки її центр не збігся з центром лози.
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

  const vanilla = parse(readFileSync(join(sourceDir, "spr_loading_bird_en.meta.toml"), "utf8")) as {
    meta_properties: { id: string; replace_id?: string };
  };
  vanilla.meta_properties.replace_id = vanilla.meta_properties.id;
  writeFileSync(join(targetDir, "spr_loading_bird_en.meta.toml"), stringify(vanilla));
}
