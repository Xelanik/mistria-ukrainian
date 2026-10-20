# FoM-UA — українська локалізація Fields of Mistria

Неофіційний фанатський мод, що додає в Fields of Mistria українську мову. Встановлюється через
[Mods of Mistria Installer (MOMI)](https://github.com/Garethp/Mods-of-Mistria-Installer).
Репозиторій: https://github.com/Xelanik/mistria-ukrainian · помилки й пропозиції: [Issues](https://github.com/Xelanik/mistria-ukrainian/issues).

**Версія мода 0.3.1 ↔ версія гри 1.0.7–1.0.8.**

## Що перекладено (v0.3)

Інтерфейс: меню, налаштування, туторіали з картками, HUD (сезони, дні тижня, календар), крафт і кастомізація,
навички, перки, фестивалі, локації, мешканці (імена й посади), побачення, інфузії, дзвони, тварини.

**Предмети** (назви й описи): культури, насіння, риба, комахи, страви й напої, ковальство й броня, матеріали,
тваринництво, артефакти, меблі всіх наборів, святкові предмети й речі побачень.

**Квести й листи:** усі запити з Дошки запитів (назви, описи, цілі, репліки при здачі), запити Корони, сюжетні квести й
квести симпатії, випробування Стілвелла й Таліферро, 206 листів. Також бонуси навичок, одяг та аксесуари, тварини
(види, масті, прикраси) і набори колекцій Музею.

Діалоги й кат-сцени — у наступних версіях. Усе, що ще не перекладено, гра показує англійською.

## Встановлення

1. Встановіть MOMI (останню версію: стара не завантажить мод із GML) і запустіть гру хоча б раз.
2. Завантажте архів мода ([Releases](https://github.com/Xelanik/mistria-ukrainian/releases) або Nexus Mods) і розпакуйте теку `FoM-UA` в `mods/` поруч із грою.
3. Відкрийте MOMI, увімкніть **FoM-UA** і натисніть Apply.
4. У грі в меню вибору мови (там, де й інші мови) оберіть **Українська**.

Мод Jlimb «Ukrainian Language» теж додає мову `ukr`, тож вмикайте лише один із двох.

Видалення: вимкніть мод у MOMI. Збереження лишаються робочими.

## Як це працює

- Переклад — звичайні файли ассетів гри (`localization/*.meta.toml`), які MOMI зливає з ванільними.
- Невеличкий GML-хук (`gml/xelanik_fomua.gml`) додає українську до старих сейвів (без нього кастомізація персонажа на
  старому збереженні падає) і підставляє українські картки туторіалів та плашку кухні.
- Деякі «запечені» в картинки написи (сезони, дні тижня, «Рів.», «Крит», картки туторіалів)
  генерують скрипти `scripts/sprites.ts` і `scripts/cards.ts`.

## Відомі обмеження

- Стартова заставка з птахом «Loading…» лишається англійською: рушій читає її з окремого PNG, а стабільний MOMI 0.16.5
  не вміє підмінити такий файл.
- Переклад не вичитано повністю; довгі підписи на кнопках іноді не вміщаються.

## Збирання з вихідників

Вимоги: Node 20+, власна копія гри (ассети в репозиторії **не** зберігаються).

```
npm install
npm run extract     # будує translations/uk.po з вашої копії гри та uk.jsonl
npm run validate
npm run build       # mod/
npm run deploy      # копіює mod/ у <гра>/Mods/FoM-UA (шлях гри: змінна FOM_GAME_DIR)
```

`translations/uk.jsonl` — публічний файл перекладу (ключ, переклад, відбиток оригіналу). `uk.po` для редагування в
Poedit відновлюється командою `npm run extract`. Правила перекладу — `STYLE.md`, терміни — `glossary.csv`,
голоси персонажів — `voices.csv`.

## Ліцензії

- Код (`scripts/`, `gml/`): MIT, див. `LICENSE`.
- Переклад, глосарій, стиль: CC BY-NC-SA 4.0, див. `translations/LICENSE.md`.
- Fields of Mistria належить NPC Studio. Проєкт неофіційний.

---

# English

Unofficial fan mod adding a Ukrainian localization to Fields of Mistria, installed via
[MOMI](https://github.com/Garethp/Mods-of-Mistria-Installer). Mod 0.3.1 targets game 1.0.7-1.0.8. This release translates the UI
(menus, settings, tutorials, HUD, crafting, perks, locations, NPC names, dates, animals) and all items (names and
descriptions), plus (0.3) quests and the Request Board, 206 letters, skill perks, clothing, animals and Museum sets; dialogues and cutscenes follow in later versions, and untranslated text stays in English. Install: update MOMI, put the
`FoM-UA` folder into `mods/`, enable it in MOMI and pick Ukrainian in the in-game language menu. Do not enable it alongside
another mod that adds the `ukr` language. The startup loading bird stays in English (the engine reads it from a
standalone PNG that stable MOMI 0.16.5 cannot replace). Code is MIT; the translation is CC BY-NC-SA 4.0. The repository contains no
game text or art.
