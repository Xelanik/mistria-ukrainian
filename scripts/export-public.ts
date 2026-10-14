// Експорт для публічного репозиторію: копіює лише дозволений набір файлів у теку (типово ../fom-ua-public).
//
// Запуск: npm run export-public [тека]
//
// Публічний репозиторій живе окремо від цього (приватного) і має власну історію: у приватній є повний uk.po з
// англійським текстом гри. Скрипт нічого не комітить; після нього: leakcheck на теці, git add/commit у ній.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { root } from "./lib";

const target = resolve(process.argv[2] ?? join(root, "..", "fom-ua-public"));
// CLAUDE.md, game-assets, tools, mod, uk.po / uk.pot — навмисно не входять.
const include = [
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "STYLE.md",
  "glossary.csv",
  "voices.csv",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "scripts",
  "gml",
  "docs",
  "translations/uk.jsonl",
  "translations/LICENSE.md",
];

const ignore = [
  "# Файли гри — НІКОЛИ не комітити",
  "game-assets/",
  "mod/",
  "tools/",
  "node_modules/",
  "translations/*.pot",
  "translations/uk.po",
  "translations/batches/",
  "*.log",
  "",
].join("\n");

mkdirSync(target, { recursive: true });
// Усе, окрім .git, прибираємо, щоб видалені в приватному файли зникли й у публічному.
for (const name of readdirSync(target)) if (name !== ".git") rmSync(join(target, name), { recursive: true, force: true });
for (const path of include) {
  if (!existsSync(join(root, path))) throw new Error(`Немає ${path}`);
  cpSync(join(root, path), join(target, path), { recursive: true });
}
writeFileSync(join(target, ".gitignore"), ignore);
console.log(`Експортовано ${include.length} елементів у ${target}`);

const check = spawnSync("npx", ["tsx", "scripts/leakcheck.ts", target], { cwd: root, stdio: "inherit", shell: true });
process.exit(check.status ?? 1);
