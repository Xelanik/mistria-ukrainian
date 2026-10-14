// translations/uk.po → translations/uk.jsonl: публічний файл без англійського тексту гри.
//
// Запуск: npm run pack   (deploy запускає його сам)
//
// У git іде лише uk.jsonl: ключ, переклад, прапорець fuzzy, нотатка й короткий відбиток оригіналу. Повний uk.po
// (з англійським msgid) лишається локальним у .gitignore, його відновлює `npm run extract` з копії гри.

import { existsSync } from "node:fs";
import { poPath, publicPath, readPo, readPublic, writePublic } from "./lib";

const before = new Map((existsSync(publicPath) ? readPublic(publicPath) : []).map((entry) => [entry.key, entry]));
const count = writePublic(publicPath, readPo(poPath));
const after = new Map(readPublic(publicPath).map((entry) => [entry.key, entry]));

let added = 0;
let changed = 0;
for (const [key, entry] of after) {
  const old = before.get(key);
  if (!old) added++;
  else if (old.hash !== entry.hash || old.msgstr !== entry.msgstr || old.fuzzy !== entry.fuzzy || old.note !== entry.note) changed++;
}
const removed = [...before.keys()].filter((key) => !after.has(key)).length;
console.log(`${publicPath}: ${count} записів (нових ${added}, змінено ${changed}, прибрано ${removed})`);
if (removed > 0) console.log("Прибрані записи зникли з uk.po: так буває, коли переклад очищено вручну або відкинуто після патча гри");
