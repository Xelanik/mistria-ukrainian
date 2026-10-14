// translations/uk.po → mod/ у структурі, яку очікує MOMI.
//
// Запуск: npm run build [-- --include-fuzzy]
//
// У збірку йдуть лише готові переклади (непорожній msgstr без fuzzy). Решта ключів відсутня в
// translations/ukr.meta.toml — гра показує для них англійський оригінал (перевірено в Фазі 1).

import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { parse, stringify } from "smol-toml";
import { assetsDir, gameVersion, poPath, readPo, root } from "./lib";
import { CARD_SPRITES, generateCards, generateLoadingScreen } from "./cards";
import { generateSprites } from "./sprites";

// Фіксовані id, щоб гра й MOMI бачили ті самі ассети між збірками.
const TRANSLATION_ID = "3a742952fb03db4e";
const SOURCE_CACHE_ID = "02ba0acc8e5b4afb";
// id ванільного l10n.meta.toml — файл зливається з ним за ключами.
const L10N_ID = "b7ca18d296aab7d5";

const packageVersion = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }).version;
const modDir = join(root, "mod");

// --include-fuzzy: пробна збірка з чернетками (для тесту в грі до перегляду в Poedit).
const includeFuzzy = process.argv.includes("--include-fuzzy");
const translated = readPo(poPath).filter((entry) => entry.msgstr && (includeFuzzy || !entry.fuzzy));
if (translated.length === 0) throw new Error("У translations/uk.po немає жодного готового перекладу");

const files = new Map<string, string>();

// 0.15.1: мод містить gml/ (хук для старих сейвів), а GML-шар MOMI є з 0.14.x і працює з грою 1.0 з 0.15.x.
// Назву й автора не міняти: з них MOMI виводить id мода (xelanik.fomua) і простір імен GML (xelanik_fomua).
files.set(
  "manifest.toml",
  stringify({
    name: "FoM-UA",
    author: "Xelanik",
    version: packageVersion,
    minInstallerVersion: "0.15.1",
    // Хуки, без яких GML-частина не працює: на старому MOMI мод буде пропущено з поясненням, а не зламано мовчки.
    requires_hooks: ["ui.menu_opened"],
  }),
);

files.set(
  "localization/translations/ukr.meta.toml",
  stringify({
    meta_properties: { id: TRANSLATION_ID, asset_kind: "L10nTarget" },
    asset_properties: Object.fromEntries(translated.map((entry) => [entry.key, entry.msgstr])),
  }),
);

// Кеш оригіналу порожній навмисно: інакше в моді поширювався б англійський текст гри (це чужі авторські права).
// У структурі Language рушія поля src_cache немає, тож гра кеш не читає (перевіряється в грі).
files.set(
  "localization/source_caches/ukr.meta.toml",
  stringify({
    meta_properties: { id: SOURCE_CACHE_ID, asset_kind: "L10nSourceCache" },
    asset_properties: {},
  }),
);

// Займенники гравця: теги <m> <f> <n> <p> у тексті (як в офіційній ru-локалізації; назви макросів задає мова).
// Припущення про те, як рушій обирає тег, перевіряється в грі — див. CLAUDE.md, журнал рішень.
files.set(
  "localization/l10n.meta.toml",
  stringify({
    meta_properties: { id: L10N_ID, asset_kind: "L10n" },
    asset_properties: {
      languages: {
        ukr: {
          display_name: "Українська",
          translation: TRANSLATION_ID,
          src_cache: SOURCE_CACHE_ID,
          ship: true,
          default_pronoun: "they_them",
          automatic_linebreaks: true,
          date_order: "DayFirst",
          // Назва інфузії стоїть ПІСЛЯ назви предмета («Суп міцності»): прикметник мусив би узгоджуватися з родом
          // предмета, а гра склеює назву з двох незалежних рядків. Родовий відмінок підходить до будь-якого роду.
          infusion_order: "Noun",
          infusion_space: " ",
          commas_in_numbers: true,
          common_button_height: 19,
          pronoun_display_order: ["they_them", "she_her", "he_him", "it_its", "all"],
          pronouns: {
            they_them: { display: "Вони / Їх", macros: ["p"] },
            she_her: { display: "Вона / Її", macros: ["f"] },
            he_him: { display: "Він / Його", macros: ["m"] },
            it_its: { display: "Воно / Його", macros: ["n"] },
            all: { display: "Будь-які", macros: ["p", "m", "f", "n"] },
          },
        },
      },
    },
  }),
);

// Без запису для мови в [standard] гра падає на assert (FiddleParsers.gml).
files.set("fiddle/ui/text_styles.toml", stringify({ standard: { ukr: "fnt_mistria_birdseed" } }));

rmSync(modDir, { recursive: true, force: true });
for (const [path, content] of files) {
  const full = join(modDir, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

// GML-хук для старих сейвів (див. gml/xelanik_fomua.gml): без нього кастомізація персонажа на старому сейві падає.
cpSync(join(root, "gml"), join(modDir, "gml"), { recursive: true });

// Гра для кожної мови просить власні спрайти з суфіксом мови (`spr_..._ukr`); без них вона падає
// («requested asset ... does not exist»). Поки справжніх українських спрайтів немає (Фаза 5), як заглушку
// беремо англійські з локальної копії ассетів — вони лише копіюються в mod/ і в git не потрапляють.
const SPRITES_WITH_LANGUAGE = [
  "Effects/spr_fx_crit",
  "UI NEW/Calendar/spr_ui_endoftheday_calendar_weekdays",
  "UI NEW/Fonts/Baked Text Assets/spr_ui_hud_calendar_baked_text_@_fall",
  "UI NEW/Fonts/Baked Text Assets/spr_ui_hud_calendar_baked_text_@_spring",
  "UI NEW/Fonts/Baked Text Assets/spr_ui_hud_calendar_baked_text_@_summer",
  "UI NEW/Fonts/Baked Text Assets/spr_ui_hud_calendar_baked_text_@_winter",
  "UI NEW/Fonts/Baked Text Assets/spr_ui_hud_font_calendar_weekdays",
  "UI NEW/Fonts/Baked Text Assets/spr_ui_hud_season_name_baked_text",
  "UI NEW/Fonts/Baked Text Assets/spr_ui_skills_lvl",
  "UI NEW/Generic/spr_ui_tooltip_icon_kitchen_level",
];
// Спрайт, який гра шукає за назвою (`string_to_asset`), мусить лежати парою png + meta у `animations/`
// (за кодом MOMI, ImageInstaller); у `images/` спрайти доступні лише за id, і гра їх «не бачить».
const animationsDir = join(assetsDir(gameVersion()), "animations");
for (const template of SPRITES_WITH_LANGUAGE) {
  // «@» — місце мови всередині назви (календар), інакше мова додається в кінець.
  const source = (language: string) => join(animationsDir, template.includes("@") ? template.replace("@", language) : `${template}_${language}`);
  const name = basename(source("ukr"));
  const targetDir = join(modDir, "animations", dirname(template));
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(`${source("eng")}.png`, join(targetDir, `${name}.png`));
  const meta = parse(readFileSync(`${source("eng")}.meta.toml`, "utf8")) as { asset_properties: object };
  // id генерує MOMI; asset_kind потрібен, бо meta лежить як звичайний ассет.
  writeFileSync(
    join(targetDir, `${name}.meta.toml`),
    stringify({ meta_properties: { asset_kind: "Animation" }, asset_properties: meta.asset_properties }),
  );
}

// Українські версії поверх заглушок (сезони, дні тижня, календар).
generateSprites(assetsDir(gameVersion()), modDir);

// Картки туторіалів з українським текстом (гра підставляє їх за назвою *_ukr, див. gml/xelanik_fomua.gml).
generateCards(assetsDir(gameVersion()), modDir);
generateLoadingScreen(assetsDir(gameVersion()), modDir);
// Список карток для GML (xelanik_fomua_card_names): гра просить лише ті `_ukr`, що справді є в моді.
const cardNames = CARD_SPRITES.map((name) => `        "${name}",`);
writeFileSync(
  join(modDir, "gml", "xelanik_fomua_cards.gml"),
  [
    "// Generated by scripts/build.ts. Tutorial card sprites shipped with the mod (<name>_ukr next to the vanilla <name>_eng).",
    "function xelanik_fomua_card_names() {",
    "    return [",
    ...cardNames,
    "    ];",
    "}",
    "",
  ].join("\n"),
);

// Читаємо назад: TOML валідний, а переклади збереглися без втрат.
for (const path of files.keys()) parse(readFileSync(join(modDir, path), "utf8"));
const target = parse(readFileSync(join(modDir, "localization/translations/ukr.meta.toml"), "utf8")) as {
  asset_properties: Record<string, string>;
};
for (const entry of translated) {
  if (target.asset_properties[entry.key] !== entry.msgstr) throw new Error(`${entry.key}: переклад спотворено`);
}

console.log(`${relative(root, modDir)}/: ${translated.length} перекладених рядків, ${files.size} файлів, версія ${packageVersion}`);
