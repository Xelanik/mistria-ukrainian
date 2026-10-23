// Витягує англійські рядки з ассетів гри в translations/uk.pot і зливає їх у translations/uk.po.
// Ключі збігаються з тими, що гра очікує в L10nTarget (msgctxt = ключ).
//
// Запуск: npm run extract [-- <версія>]   (за замовчуванням — найновіша тека в game-assets/)

import { existsSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse } from "smol-toml";
import { assetsDir, gameVersion, hashOf, potPath, poPath, publicPath, readPo, readPublic, root, walk, writePo } from "./lib";

const version = gameVersion(process.argv[2]);
const assets = assetsDir(version);

const entries: { key: string; text: string; comments: string[] }[] = [];
const seen = new Set<string>();

function add(key: string, text: string, comments: string[]) {
  // Гра зберігає англійський оригінал без кінцевих пробілів.
  const trimmed = text.trimEnd();
  if (!trimmed || seen.has(key)) return;
  seen.add(key);
  entries.push({ key, text: trimmed, comments });
}

const slashes = (path: string) => path.split(sep).join("/");
const isTable = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// ---------- t2: діалоги й кат-сцени ----------

function addDialogueNode(key: string, node: Record<string, unknown>, comments: string[], speaker: unknown) {
  const nodeSpeaker = typeof node.speaker === "string" ? node.speaker : speaker;
  const nodeComments = typeof nodeSpeaker === "string" ? [...comments, `speaker: ${nodeSpeaker}`] : comments;
  if (typeof node.local === "string") add(key, node.local, nodeComments);
  if (Array.isArray(node.prompts)) {
    node.prompts.forEach((prompt, i) => {
      if (isTable(prompt) && typeof prompt.local === "string") {
        add(`${key}/prompts/${i}`, prompt.local, [...comments, "відповідь гравця"]);
      }
    });
  }
}

for (const file of walk(join(assets, "t2"), ".c.toml")) {
  const rel = slashes(relative(join(assets, "t2"), file)).replace(/\.c\.toml$/, "");
  const source = `t2/${rel}.c.toml`;
  const toml = parse(readFileSync(file, "utf8"));
  for (const [name, conversation] of Object.entries(toml)) {
    if (!isTable(conversation)) continue;
    const base = `${rel}/${name}`;
    const comments = [`${source} [${name}]`];
    // Мовець розмови: явне `speaker`, інакше NPC з `requires = [{ npc = "..." }]` (так задано 7143 із 7150 розмов
    // у Conversations/Bank, і це не завжди NPC з назви папки: «pregnancy_adeline_eiland_0» говорить Ейланд).
    const required = Array.isArray(conversation.requires) ? conversation.requires.find((r) => isTable(r) && typeof r.npc === "string") : undefined;
    const speaker = typeof conversation.speaker === "string" ? conversation.speaker : isTable(required) ? required.npc : undefined;
    addDialogueNode(`${base}/init`, conversation, comments, speaker);
    for (const [nodeName, node] of Object.entries(conversation)) {
      if (isTable(node)) addDialogueNode(`${base}/${nodeName}`, node, comments, speaker);
    }
  }
}

// ---------- fiddle: поля, перелічені в l10n.meta.toml → fiddle_renames ----------

const l10n = parse(readFileSync(join(assets, "localization", "l10n.meta.toml"), "utf8")) as {
  asset_properties: { fiddle_renames: Record<string, string[]> };
};
const renames = Object.entries(l10n.asset_properties.fiddle_renames);

// pattern — шлях через `/`, де `*` означає будь-який ключ таблиці чи індекс масиву.
function collect(node: unknown, segments: string[], keyPath: string[], visit: (keyPath: string[], text: string) => void) {
  const [segment, ...rest] = segments;
  if (segment === undefined) {
    if (typeof node === "string") visit(keyPath, node);
    return;
  }
  if (Array.isArray(node)) {
    if (segment === "*") node.forEach((item, i) => collect(item, rest, [...keyPath, String(i)], visit));
    else if (/^\d+$/.test(segment)) collect(node[Number(segment)], rest, [...keyPath, segment], visit);
  } else if (isTable(node)) {
    if (segment === "*") {
      for (const [k, v] of Object.entries(node)) collect(v, rest, [...keyPath, k], visit);
    } else if (segment in node) {
      collect(node[segment], rest, [...keyPath, segment], visit);
    }
  }
}

for (const file of walk(join(assets, "fiddle"), ".toml")) {
  const rel = slashes(relative(join(assets, "fiddle"), file)).replace(/\.toml$/, "");
  if (rel.endsWith(".meta") || rel.endsWith(".c")) continue;
  const patterns = renames.flatMap(([prefix, fields]) =>
    (rel === prefix || rel.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`)) ? fields : [],
  );
  if (patterns.length === 0) continue;
  const toml = parse(readFileSync(file, "utf8"));
  for (const pattern of patterns) {
    collect(toml, pattern.split("/"), [], (keyPath, text) => {
      // Заглушка для відсутнього тексту — не контент.
      if (text === "MISSING") return;
      add([rel, ...keyPath].join("/"), text, [`fiddle/${rel}.toml`]);
    });
  }
}

// ---------- запис .pot і злиття в .po ----------

const template = entries.map(({ key, text, comments }) => ({
  key,
  msgid: text,
  msgstr: "",
  fuzzy: false,
  comments,
  note: "",
}));
writePo(potPath, version, template);

// Заміна msgmerge. Попередній стан — локальний uk.po (з англійським оригіналом) або, якщо його немає (свіжий клон),
// публічний uk.jsonl, де від оригіналу лишився тільки відбиток. Оригінали порівнюються за відбитком.
// Переклад зберігається, якщо збігся і ключ, і оригінал. Інакше:
// - той самий оригінал тепер стоїть під іншим ключем (файл перейменовано або в списку вставили елемент і індекси
//   зсунулись) → переклад іде за оригіналом, як fuzzy;
// - оригінал під ключем змінився, але лишився схожим (або тексту для порівняння немає, лише відбиток) → старий
//   переклад як fuzzy;
// - оригінал змінився радикально → старий переклад відкидається (він лишається в історії git).
const previousSource = existsSync(poPath) ? "uk.po" : existsSync(publicPath) ? "uk.jsonl" : "порожній";
const previous: { key: string; hash: string; msgid?: string; msgstr: string; fuzzy: boolean; note: string }[] =
  previousSource === "uk.po"
    ? readPo(poPath).map((entry) => ({ ...entry, hash: hashOf(entry.msgid) }))
    : previousSource === "uk.jsonl"
      ? readPublic(publicPath)
      : [];
const previousByKey = new Map(previous.map((entry) => [entry.key, entry]));
const currentHashByKey = new Map(template.map((entry) => [entry.key, hashOf(entry.msgid)]));
// Переклади, оригінал яких більше не стоїть під своїм ключем.
const displacedByHash = new Map<string, (typeof previous)[number]>();
for (const entry of previous) {
  if (entry.msgstr && currentHashByKey.get(entry.key) !== entry.hash) displacedByHash.set(entry.hash, entry);
}

const words = (text: string) => new Set(text.toLowerCase().split(/\s+/));
function isSimilar(a: string, b: string) {
  const [wordsA, wordsB] = [words(a), words(b)];
  const shared = [...wordsA].filter((word) => wordsB.has(word)).length;
  return shared / (wordsA.size + wordsB.size - shared) >= 0.5;
}

const stats = { kept: 0, changed: 0, moved: 0, added: 0, dropped: 0 };
const merged = template.map((entry) => {
  const hash = hashOf(entry.msgid);
  const prev = previousByKey.get(entry.key);
  if (prev && (prev.msgstr || prev.note) && prev.hash === hash) {
    if (prev.msgstr) stats.kept++;
    return { ...entry, msgstr: prev.msgstr, fuzzy: prev.fuzzy, note: prev.note };
  }
  const displaced = displacedByHash.get(hash);
  if (displaced) {
    stats.moved++;
    return { ...entry, msgstr: displaced.msgstr, fuzzy: true, note: displaced.note };
  }
  if (prev?.msgstr && (prev.msgid === undefined || isSimilar(prev.msgid, entry.msgid))) {
    stats.changed++;
    return { ...entry, msgstr: prev.msgstr, fuzzy: true, note: prev.note };
  }
  stats.added++;
  return entry;
});
stats.dropped = previous.filter((entry) => entry.msgstr).length - stats.kept - stats.changed - stats.moved;
writePo(poPath, version, merged);

const byGroup = new Map<string, number>();
for (const { key } of entries) {
  const group = key.split("/")[0] ?? key;
  byGroup.set(group, (byGroup.get(group) ?? 0) + 1);
}
console.log(`Гра ${version}: ${entries.length} рядків → ${relative(root, potPath)}, ${relative(root, poPath)}`);
for (const [group, count] of [...byGroup].sort((a, b) => b[1] - a[1])) console.log(`  ${group}: ${count}`);
console.log(
  `Злиття з попереднім станом (${previousSource}): збережено ${stats.kept}, змінено оригінал (fuzzy) ${stats.changed}, ` +
    `переїхало (fuzzy) ${stats.moved}, нових ${stats.added}, відкинуто ${stats.dropped}`,
);
