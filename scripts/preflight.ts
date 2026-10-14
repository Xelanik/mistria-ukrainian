// Офлайн-перевірка mod/ кодом самого MOMI: маніфест, лінт, компіляція GML. У гру нічого не пишеться.
//
// Запуск: npm run preflight   (після npm run build; deploy запускає її сам, якщо CLI є)
//
// Потрібен лише CLI: ModsOfMistriaInstaller-cli.exe з релізів https://github.com/Garethp/Mods-of-Mistria-Installer
// у теку tools/ (вона в .gitignore). Чисті ассети — assets.bak.zip, який MOMI лишає біля гри.
// Коди виходу CLI: 0 — мод встановиться, 1 — MOMI його пропустить, 2 — перевірку не вдалося виконати.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gameDir, momiCliPath, root } from "./lib";

// Чиста копія ассетів: assets.bak.zip, який MOMI створює при застосуванні модів і прибирає, коли модів не лишається
// (тоді чистим є сам assets.zip). Установлені MOMI моди перелічені в %LOCALAPPDATA%/FieldsOfMistria/mods/manifest.json.
const backup = join(gameDir, "assets.bak.zip");
const installedModsPath = join(process.env.LOCALAPPDATA ?? "", "FieldsOfMistria", "mods", "manifest.json");
const installedMods = existsSync(installedModsPath)
  ? (JSON.parse(readFileSync(installedModsPath, "utf8")) as { mods: unknown[] }).mods.length
  : 0;
const pristine = existsSync(backup) ? backup : join(gameDir, "assets.zip");
if (!existsSync(backup) && installedMods > 0) {
  throw new Error(`Немає ${backup}, а в MOMI встановлено ${installedMods} мод(ів): assets.zip не чистий`);
}
if (!existsSync(momiCliPath)) throw new Error(`Немає ${momiCliPath}: завантажте ModsOfMistriaInstaller-cli.exe з релізів MOMI`);

const result = spawnSync(
  momiCliPath,
  ["--lint", join(root, "mod"), pristine, "--strict-lints", "--compile-check", "require"],
  { stdio: "inherit" },
);
if (result.status === 2) {
  console.error("\nCLI не зміг виконати перевірку: можливо, його каталог якорів застарів для цієї версії гри — оновіть CLI");
}
process.exit(result.status ?? 1);
