// Перевіряє, що в пакеті мода й у файлах репозиторію немає англійського тексту гри.
//
// Запуск: npm run leakcheck   (deploy запускає його сам після build)
//
// Береться кожен англійський оригінал з translations/uk.po довжиною від 25 символів і шукається в текстових файлах
// mod/ та у відстежуваних git файлах (крім uk.po, якого в git нема). Збіг = помилка: цей текст поширювати не можна.
// Для роботи потрібен локальний uk.po (його відновлює extract).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { poPath, readPo, root, walk } from "./lib";

const MIN_LENGTH = 25;
const TEXT_FILE = /\.(toml|gml|json|jsonl|md|csv|ts|txt)$/;

const needles = [...new Set(readPo(poPath).map((entry) => entry.msgid))].filter((text) => text.length >= MIN_LENGTH);

const tracked = spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .stdout.split("\n")
  .filter(Boolean)
  .map((path) => join(root, path));
// Необов'язковий аргумент — додаткова тека (напр. експорт для публічного репозиторію, див. export-public.ts).
const extraDir = process.argv[2];
const extra = extraDir ? walk(extraDir).filter((path) => !/[\\/](\.git|node_modules)[\\/]/.test(path)) : [];
const files = [...new Set([...walk(join(root, "mod")), ...tracked, ...extra])].filter((path) => TEXT_FILE.test(path));

let leaks = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const found = needles.filter((needle) => text.includes(needle));
  if (found.length === 0) continue;
  leaks += found.length;
  console.error(`${relative(root, file)}: ${found.length} англійських фраз гри, напр. «${found[0]!.slice(0, 60)}»`);
}

if (leaks > 0) {
  console.error(`\nЗнайдено ${leaks} збігів: англійський текст гри потрапив у пакет чи репозиторій`);
  process.exit(1);
}
console.log(`Англійського тексту гри немає: перевірено ${files.length} файлів на ${needles.length} фраз`);
