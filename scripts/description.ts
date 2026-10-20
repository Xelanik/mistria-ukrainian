// docs/nexus-description.bbcode.txt (шаблон) → release/nexus-description.bbcode.txt (готовий текст для сторінки Nexus).
//
// Запуск: npm run description   (npm run release запускає його сам)
//
// У шаблоні підставляються:
//   {{version}} — версія з package.json (0.3.0);
//   {{short}}   — мажорна й мінорна частини (0.3);
//   {{game}}    — діапазон версій гри з першого рядка таблиці в CHANGELOG.md (1.0.7–1.0.8).
// Решту тексту (списки «Що перекладено» тощо) правимо в шаблоні вручну перед релізом.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./lib";

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
const row = changelog.split(/\r?\n/).find((line) => line.startsWith(`| ${version} |`));
if (!row) throw new Error(`У CHANGELOG.md немає рядка таблиці для версії ${version}`);
const game = row.split("|")[2]?.trim();
if (!game) throw new Error("Не вдалося прочитати версію гри з CHANGELOG.md");

const values: Record<string, string> = { version, short: version.split(".").slice(0, 2).join("."), game };
const template = readFileSync(join(root, "docs", "nexus-description.bbcode.txt"), "utf8");
const text = template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
  const value = values[name];
  if (value === undefined) throw new Error(`У шаблоні невідомий підпис {{${name}}}`);
  return value;
});

mkdirSync(join(root, "release"), { recursive: true });
writeFileSync(join(root, "release", "nexus-description.bbcode.txt"), text);
console.log(`release/nexus-description.bbcode.txt: версія ${version}, гра ${game}`);
