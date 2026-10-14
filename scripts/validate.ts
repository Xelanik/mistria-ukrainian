// Перевіряє translations/uk.po перед збіркою. Помилки → код виходу 1, попередження не блокують.
//
// Запуск: npm run validate [-- <версія>] [--include-fuzzy]
//
// Перевіряється лише готовий переклад: непорожній msgstr без прапорця fuzzy.
// Валідність згенерованого TOML перевіряє build.ts (читає свої файли назад).

import { join } from "node:path";
import { openSync } from "fontkit";
import { assetsDir, gameVersion, poPath, readPo } from "./lib";

const version = gameVersion(process.argv.slice(2).find((arg) => !arg.startsWith("--")));
const font = openSync(join(assetsDir(version), "fonts", "fnt_mistria_birdseed.ttf"));
if (!("characterSet" in font)) throw new Error("fnt_mistria_birdseed.ttf: очікувався один шрифт, а не колекція");
const glyphs = new Set(font.characterSet);

// Панель туторіалу вміщає 3 рядки. Ширина рядка відкалібрована за скриншотами гри (рядки до 196 «пікселів
// шрифту» вміщалися, а слова, що давали 207 і більше, переносилися). 1 піксель шрифту = 128 одиниць.
const TUTORIAL_LINE_WIDTH = 196;
const TUTORIAL_MAX_LINES = 3;
const textWidth = (text: string) => font.layout(text).advanceWidth / 128;
function wrappedLines(text: string, maxWidth: number) {
  let count = 0;
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && textWidth(candidate) > maxWidth) {
        count++;
        line = word;
      } else line = candidate;
    }
    count++;
  }
  return count;
}

// UI-рядки: довший переклад може не влізти в кнопку чи вкладку.
const isUi = (key: string) => key.startsWith("ui/") || key.startsWith("misc_local/") || key.endsWith("/name");
const MAX_UI_GROWTH = 1.5;

// --include-fuzzy: перевірити й чернетки (fuzzy), щоб ловити помилки до того, як їх зніме Poedit.
const includeFuzzy = process.argv.includes("--include-fuzzy");

const entries = readPo(poPath);
const translated = entries.filter((entry) => entry.msgstr && (includeFuzzy || !entry.fuzzy));

const errors = new Map<string, string[]>();
const warnings = new Map<string, string[]>();
const report = (target: typeof errors, rule: string, key: string, detail: string) => {
  const list = target.get(rule) ?? [];
  list.push(`${key}: ${detail}`);
  target.set(rule, list);
};

const countAll = (text: string, pattern: RegExp) => {
  const counts = new Map<string, number>();
  for (const match of text.matchAll(pattern)) counts.set(match[0], (counts.get(match[0]) ?? 0) + 1);
  return counts;
};
const describeDiff = (original: Map<string, number>, translation: Map<string, number>) => {
  const parts: string[] = [];
  for (const token of new Set([...original.keys(), ...translation.keys()])) {
    const a = original.get(token) ?? 0;
    const b = translation.get(token) ?? 0;
    if (a !== b) parts.push(`${token} ×${a} → ×${b}`);
  }
  return parts.join(", ");
};

const checks: [string, RegExp][] = [
  ["токени [..]", /\[[^\]]*\]/g],
  // Теги займенників перевіряються окремо (в ukr вони інші, ніж в англійській).
  ["теги <..>", /<(?!\/?(?:they|she|he|it|none|[mfnp])>)\/?[a-z_/]+>/g],
  ["плейсхолдер {}", /\{\}/g],
  // Парні маркери виділення: $жовтий$ =рожевий= ^фіолетовий^ #тремтіння#
  ["маркери виділення", /[$=^#]/g],
];

for (const { key, msgid, msgstr } of translated) {
  for (const [rule, pattern] of checks) {
    const original = countAll(msgid, pattern);
    const translation = countAll(msgstr, pattern);
    const diff = describeDiff(original, translation);
    if (diff) report(errors, rule, key, diff);
  }

  // Рід гравця: у ukr доступні макроси m f n p; якщо є хоч один тег, мають бути всі чотири й однаково.
  const pronounTags = countAll(msgstr, /<\/?(?:they|she|he|it|none|[mfnp])>/g);
  const foreign = [...pronounTags.keys()].filter((tag) => /^<\/?(?:they|she|he|it|none)>$/.test(tag));
  if (foreign.length > 0) report(errors, "теги займенників", key, `англійські теги ${foreign.join(" ")} замість m/f/n/p`);
  if (pronounTags.size > 0 && foreign.length === 0) {
    const groups = ["m", "f", "n", "p"].map((tag) => [pronounTags.get(`<${tag}>`) ?? 0, pronounTags.get(`</${tag}>`) ?? 0]);
    const first = groups[0]?.[0] ?? 0;
    if (!groups.every(([open, close]) => open === close && open === first)) {
      report(errors, "теги займенників", key, "кожен з <m> <f> <n> <p> має бути відкритий і закритий однакову кількість разів");
    }
  }

  const missing = [...new Set(msgstr)].filter((char) => char !== "\n" && !glyphs.has(char.codePointAt(0) ?? 0));
  if (missing.length > 0) {
    report(errors, "символи поза шрифтом", key, missing.map((c) => `«${c}» U+${c.codePointAt(0)?.toString(16)}`).join(", "));
  }

  // Ці літери є в шрифті (він спільний із російською), але в українському тексті — майже напевно помилка.
  const russian = msgstr.match(/[ёъыэЁЪЫЭ]/g);
  if (russian) report(warnings, "російські літери", key, [...new Set(russian)].join(" "));

  if (key.startsWith("ui/tutorials/") && key.endsWith("/text")) {
    const lines = wrappedLines(msgstr, TUTORIAL_LINE_WIDTH);
    if (lines > TUTORIAL_MAX_LINES) report(warnings, "туторіал довший за 3 рядки", key, `${lines} рядки`);
  }

  if (isUi(key) && msgstr.length > msgid.length * MAX_UI_GROWTH && msgstr.length - msgid.length >= 4) {
    report(warnings, "переклад UI довший за оригінал", key, `${msgid.length} → ${msgstr.length} символів`);
  }
}

const print = (title: string, target: typeof errors) => {
  for (const [rule, list] of target) {
    console.log(`\n${title}: ${rule} — ${list.length}`);
    for (const line of list.slice(0, Number(process.env.WARN_LIMIT ?? 10))) console.log(`  ${line}`);
    if (list.length > 10) console.log(`  … ще ${list.length - 10}`);
  }
};
print("ПОМИЛКА", errors);
print("Попередження", warnings);

const fuzzy = entries.filter((entry) => entry.msgstr && entry.fuzzy).length;
console.log(
  `\nРядків у .po: ${entries.length}; перекладено: ${translated.length}; fuzzy (у збірку не йдуть): ${fuzzy}; ` +
    `без перекладу: ${entries.length - translated.length - fuzzy}`,
);
const errorCount = [...errors.values()].reduce((sum, list) => sum + list.length, 0);
console.log(errorCount > 0 ? `Помилок: ${errorCount}` : "Помилок немає");
process.exit(errorCount > 0 ? 1 : 0);
