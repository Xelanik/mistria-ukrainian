// Пакетний переклад: перегляд неперекладеного за секціями й злиття нумерованих перекладів у JSONL для `npm run apply`.
//
// Запуск:
//   npm run batch -- view <назва> <регулярний вираз за ключем>   → translations/batches/<назва>-view.txt і <назва>-index.txt
//   npm run batch -- merge <назва>                              → translations/batches/<назва>.jsonl
//
// Потік роботи:
//   1. `view`: у <назва>-view.txt рядки згруповано за секціями (квест/розмова) із мовцем і профілем із voices.csv;
//      кожен рядок має вигляд `N|хвіст ключа|англійський текст` (перенос рядка в тексті — літерні `\n`).
//   2. Переклад пишемо у файли translations/batches/tr-<назва>-01.txt, -02.txt… рядками `N|український текст`
//      (те саме `\n` для переносу). Виправлення — у fix-<назва>.txt (пізніший запис того самого N перемагає).
//   3. `merge` перевіряє, що кожен N має переклад, і пише <назва>.jsonl (ключ → переклад зі справжніми переносами).
//   4. `npm run apply -- translations/batches/<назва>.jsonl [--final]` вносить пакет у uk.po.
// Каталог translations/batches/ у .gitignore (там англійський текст гри в -view.txt).

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { poPath, readPo, root } from "./lib";

const dir = join(root, "translations", "batches");
const [command, name, pattern] = process.argv.slice(2);
if (!command || !name) throw new Error("Використання: npm run batch -- view <назва> <regex> | merge <назва>");
const backslashN = String.fromCharCode(92) + "n";

if (command === "view") {
  if (!pattern) throw new Error("Потрібен регулярний вираз за ключем, напр. '^Cutscenes/Story Events/'");
  const voices = new Map<string, string>();
  for (const line of readFileSync(join(root, "voices.csv"), "utf8").split(/\r?\n/).slice(1)) {
    const cells = line.split(",");
    if (cells[0]) voices.set(cells[0], `${cells[1]} (${cells[2]}, ${cells[3]})`);
  }
  const re = new RegExp(pattern);
  const todo = readPo(poPath).filter((entry) => !entry.msgstr && re.test(entry.key));
  const sectionOf = (key: string) => key.split("/").slice(0, 3).join("/");
  const order = new Map<string, number>();
  todo.forEach((entry) => order.has(sectionOf(entry.key)) || order.set(sectionOf(entry.key), order.size));
  const numbered = todo.map((entry, i) => ({ entry, n: i + 1 }));
  numbered.sort((a, b) => order.get(sectionOf(a.entry.key))! - order.get(sectionOf(b.entry.key))! || a.n - b.n);

  // У кат-сценах мовці змінюються всередині секції: позначаємо кожну зміну таблиці (`### …`) і мовця (`> …`).
  const lines: string[] = [];
  let last = "";
  let lastTable = "";
  let lastSpeaker = "";
  for (const { entry, n } of numbered) {
    const section = sectionOf(entry.key);
    const speaker = entry.comments.find((c) => c.startsWith("speaker:"))?.replace("speaker: ", "") ?? "";
    const table = entry.comments[0] ?? "";
    if (section !== last) {
      lines.push("", `## ${section}${speaker ? ` | ${voices.get(speaker) ?? speaker}` : ""}`);
      last = section;
      lastTable = "";
    }
    if (table !== lastTable) {
      lines.push(`### ${table.replace(/^.*\[/, "[")}`);
      lastTable = table;
      lastSpeaker = "";
    }
    if (speaker && speaker !== lastSpeaker) lines.push(`> ${voices.get(speaker) ?? speaker}`);
    lastSpeaker = speaker || lastSpeaker;
    lines.push(`${n}|${entry.key.split("/").slice(3).join("/")}|${entry.msgid.split("\n").join(backslashN)}`);
  }
  writeFileSync(join(dir, `${name}-view.txt`), lines.join("\n") + "\n");
  writeFileSync(join(dir, `${name}-index.txt`), numbered.map(({ entry, n }) => `${n}\t${entry.key}`).sort((a, b) => parseInt(a) - parseInt(b)).join("\n") + "\n");
  console.log(`${todo.length} рядків, ${order.size} секцій → translations/batches/${name}-view.txt`);
} else if (command === "merge") {
  const keys = new Map<number, string>();
  for (const line of readFileSync(join(dir, `${name}-index.txt`), "utf8").split("\n").filter(Boolean)) {
    const [n, key] = line.split("\t");
    keys.set(Number(n), key!);
  }
  const files = readdirSync(dir).filter((f) => f.startsWith(`tr-${name}-`) && f.endsWith(".txt")).sort();
  if (existsSync(join(dir, `fix-${name}.txt`))) files.push(`fix-${name}.txt`);
  const translations = new Map<number, string>();
  for (const file of files) {
    for (const line of readFileSync(join(dir, file), "utf8").split(/\r?\n/).filter(Boolean)) {
      const bar = line.indexOf("|");
      const n = Number(line.slice(0, bar));
      if (!keys.has(n)) console.warn(`${file}: зайвий номер ${n}`);
      translations.set(n, line.slice(bar + 1).split(backslashN).join("\n"));
    }
  }
  const missing = [...keys.keys()].filter((n) => !translations.has(n));
  console.log(`ключів ${keys.size}, перекладів ${translations.size}, без перекладу: ${missing.join(",") || "немає"}`);
  const rows = [...translations]
    .filter(([n]) => keys.has(n))
    .sort((a, b) => a[0] - b[0])
    .map(([n, msgstr]) => JSON.stringify({ key: keys.get(n), msgstr }));
  writeFileSync(join(dir, `${name}.jsonl`), rows.join("\n") + "\n");
  if (missing.length > 0) process.exitCode = 1;
} else {
  throw new Error(`Невідома команда «${command}»`);
}
