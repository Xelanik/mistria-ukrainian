// Спільне для extract / build / validate / deploy.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { po } from "gettext-parser";
import type { GetTextTranslation } from "gettext-parser";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const gameDir = process.env.FOM_GAME_DIR ?? "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fields of Mistria";
export const momiCliPath = join(root, "tools", "ModsOfMistriaInstaller-cli.exe");
export const potPath = join(root, "translations", "uk.pot");
export const poPath = join(root, "translations", "uk.po");
export const publicPath = join(root, "translations", "uk.jsonl");
export const packageVersion = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }).version;

/** Усі файли теки (з вкладеними), за алфавітом; з `suffix` — лише ті, чиї назви ним закінчуються. */
export function walk(dir: string, suffix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return walk(path, suffix);
      return entry.name.endsWith(suffix) ? [path] : [];
    });
}

/** Найновіша тека в game-assets/ (або та, що передана аргументом). */
export function gameVersion(requested?: string) {
  const versions = readdirSync(join(root, "game-assets"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const version = requested ?? versions.at(-1);
  if (!version) throw new Error("У game-assets/ немає жодної теки з ассетами");
  return version;
}

export const assetsDir = (version: string) => join(root, "game-assets", version, "assets");

/** Короткий відбиток англійського оригіналу: за ним після патча видно, що текст змінився, без самого тексту. */
export const hashOf = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 10);

/**
 * Публічний файл translations/uk.jsonl: ключ, переклад і відбиток оригіналу, без англійського тексту гри.
 * Перший рядок — формат, далі по рядку на ключ, де є переклад чи нотатка.
 */
export function readPublic(path: string) {
  const [header, ...lines] = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  if ((JSON.parse(header ?? "{}") as { format?: number }).format !== 1) throw new Error(`${path}: невідомий формат`);
  return lines.map((line) => {
    const entry = JSON.parse(line) as { key: string; hash: string; msgstr: string; fuzzy?: boolean; note?: string };
    return {
      key: entry.key,
      hash: entry.hash,
      msgid: undefined as string | undefined,
      msgstr: entry.msgstr,
      fuzzy: entry.fuzzy ?? false,
      note: entry.note ?? "",
    };
  });
}

export function writePublic(path: string, entries: ReturnType<typeof readPo>) {
  const lines = entries
    .filter(({ msgstr, note }) => msgstr || note)
    .map(({ key, msgid, msgstr, fuzzy, note }) =>
      JSON.stringify({ key, hash: hashOf(msgid), msgstr, ...(fuzzy && { fuzzy }), ...(note && { note }) }),
    );
  writeFileSync(path, [JSON.stringify({ format: 1 }), ...lines].join("\n") + "\n");
  return lines.length;
}

export function readPo(path: string) {
  if (!existsSync(path)) throw new Error(`Немає ${path}: запустіть npm run extract`);
  const parsed = po.parse(readFileSync(path));
  const entries: {
    key: string;
    msgid: string;
    msgstr: string;
    fuzzy: boolean;
    /** Коментарі розробника (`#.`): файл-джерело, спікер. */
    comments: string[];
    /** Коментарі перекладача (`#`), їх додає Poedit. */
    note: string;
  }[] = [];
  for (const [key, byMsgid] of Object.entries(parsed.translations)) {
    if (!key) continue;
    for (const entry of Object.values(byMsgid)) {
      entries.push({
        key,
        msgid: entry.msgid,
        msgstr: entry.msgstr[0] ?? "",
        fuzzy: entry.comments?.flag?.split(/[,\s]+/).includes("fuzzy") ?? false,
        comments: entry.comments?.extracted?.split("\n") ?? [],
        note: entry.comments?.translator ?? "",
      });
    }
  }
  return entries;
}

export function writePo(path: string, version: string, entries: ReturnType<typeof readPo>) {
  const translations: Record<string, Record<string, GetTextTranslation>> = {
    "": { "": { msgid: "", msgstr: [""] } },
  };
  for (const { key, msgid, msgstr, fuzzy, comments, note } of entries) {
    translations[key] = {
      [msgid]: {
        msgctxt: key,
        msgid,
        msgstr: [msgstr],
        comments: {
          extracted: comments.join("\n"),
          ...(note && { translator: note }),
          ...(fuzzy && { flag: "fuzzy" }),
        },
      },
    };
  }
  const data = po.compile(
    {
      charset: "utf-8",
      headers: {
        "Project-Id-Version": "FoM-UA",
        "Language": "uk",
        "MIME-Version": "1.0",
        "Content-Type": "text/plain; charset=UTF-8",
        "Content-Transfer-Encoding": "8bit",
        "Plural-Forms":
          "nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);",
        "X-Game-Version": version,
      },
      translations,
    },
    { foldLength: 0 },
  );
  writeFileSync(path, data);
}
