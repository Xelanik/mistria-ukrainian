// build → validate → копіювання mod/ у <гра>/Mods/FoM-UA.
// Застосувати мод у грі треба в MOMI вручну (його CLI лише перевіряє мод: див. preflight.ts).
//
// Запуск: npm run deploy [-- --include-fuzzy]
// Шлях до гри: змінна середовища FOM_GAME_DIR, інакше типовий шлях Steam.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { gameDir, momiCliPath, root } from "./lib";

if (!existsSync(join(gameDir, "FieldsOfMistria.exe"))) {
  throw new Error(`Гру не знайдено в «${gameDir}». Задайте FOM_GAME_DIR.`);
}

// --include-fuzzy передається в validate і build: пробне розгортання з чернетками.
const extraArgs = process.argv.slice(2).filter((arg) => arg === "--include-fuzzy");

function run(script: string, args: string[] = []) {
  const result = spawnSync(process.execPath, ["--import", "tsx", join(root, "scripts", script), ...args], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`\n${script} завершився з помилкою — деплой скасовано`);
    process.exit(result.status ?? 1);
  }
}

// Публічний uk.jsonl оновлюється з тим самим, що йде в гру, щоб у git не відставав від перевіреного в Poedit.
run("pack.ts");
run("validate.ts", extraArgs);
run("build.ts", extraArgs);
// Англійський текст гри в пакеті чи репозиторії поширювати не можна.
run("leakcheck.ts");
// Зламаний GML MOMI пропустив би цілком (разом з перекладом), тому без перевірки його в Mods не копіюємо.
if (existsSync(momiCliPath)) run("preflight.ts");
else console.warn(`\nУвага: немає ${momiCliPath}, перевірку мода кодом MOMI пропущено (див. scripts/preflight.ts)`);

const target = join(gameDir, "Mods", "FoM-UA");
rmSync(target, { recursive: true, force: true });
cpSync(join(root, "mod"), target, { recursive: true });
console.log(`\nСкопійовано в ${target}\nЗалишилось: відкрити MOMI і застосувати мод FoM-UA.`);
