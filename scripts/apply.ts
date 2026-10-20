// Вносить пакет перекладів у translations/uk.po. Кожен рядок JSONL: {"key": "...", "msgstr": "...", "note"?: "..."}.
//
// Запуск: npm run apply -- <файл.jsonl> [--force] [--final]
//
// Усе, що вносить apply, позначається fuzzy (без --final): вичитує Олександр у Poedit. Вичитаний рядок (є переклад, немає fuzzy)
// не перезаписується, доки не передано --force. Перед запуском закрийте Poedit: він тримає файл у пам'яті й
// перезапише зміни при збереженні.

import { readFileSync } from "node:fs";
import { gameVersion, poPath, readPo, writePo } from "./lib";

const file = process.argv[2];
if (!file) throw new Error("Вкажіть файл JSONL: npm run apply -- <файл.jsonl>");
const force = process.argv.includes("--force");
// --final: пакет вносимо без fuzzy (рішення автора: вичитка пізніше).
const final = process.argv.includes("--final");

const batch = readFileSync(file, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, i) => {
    const item = JSON.parse(line) as { key?: string; msgstr?: string; note?: string };
    if (!item.key || typeof item.msgstr !== "string") throw new Error(`${file}:${i + 1}: потрібні поля key і msgstr`);
    return { key: item.key, msgstr: item.msgstr, note: item.note };
  });

const entries = readPo(poPath);
const byKey = new Map(entries.map((entry) => [entry.key, entry]));
const stats = { added: 0, changed: 0, same: 0, protectedReviewed: 0 };
for (const { key, msgstr, note } of batch) {
  const entry = byKey.get(key);
  if (!entry) throw new Error(`Немає ключа в uk.po: ${key}`);
  if (entry.msgstr === msgstr && (note === undefined || entry.note === note)) {
    stats.same++;
    continue;
  }
  if (entry.msgstr && !entry.fuzzy && !force) {
    console.warn(`Пропущено (вичитано): ${key}`);
    stats.protectedReviewed++;
    continue;
  }
  if (entry.msgstr) stats.changed++;
  else stats.added++;
  entry.msgstr = msgstr;
  entry.fuzzy = !final;
  if (note !== undefined) entry.note = note;
}

writePo(poPath, gameVersion(), entries);
console.log(`${file}: ${batch.length} рядків; нових ${stats.added}, змінено ${stats.changed}, без змін ${stats.same}, захищено ${stats.protectedReviewed}`);
