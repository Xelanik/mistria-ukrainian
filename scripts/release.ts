// Збирає архів релізу release/FoM-UA-<версія>.zip з теки mod/ (усередині тека FoM-UA/).
//
// Запуск: npm run release   (спершу npm run build)
//
// Архів робить tar.exe з Windows 10+ (bsdtar; GNU tar із Git Bash zip не вміє): на відміну від Compress-Archive з Windows PowerShell 5.1, він пише
// шляхи зі скісною рискою, тож архів однаково відкривається в Windows, Linux і macOS.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { packageVersion as version, root } from "./lib";

const stage = join(root, "release", "stage");
const zip = join(root, "release", `FoM-UA-${version}.zip`);

rmSync(stage, { recursive: true, force: true });
rmSync(zip, { force: true });
mkdirSync(stage, { recursive: true });
cpSync(join(root, "mod"), join(stage, "FoM-UA"), { recursive: true });

const result = spawnSync(join(process.env.SystemRoot ?? "C:/Windows", "System32", "tar.exe"), ["-a", "-c", "-f", zip, "-C", stage, "FoM-UA"], { stdio: "inherit" });
rmSync(stage, { recursive: true, force: true });
if (result.status !== 0) throw new Error("tar не зміг створити архів");
console.log(`release/FoM-UA-${version}.zip`);
