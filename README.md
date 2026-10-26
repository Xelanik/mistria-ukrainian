# FoM-UA — українська локалізація Fields of Mistria

Неофіційний фанатський мод, що додає в Fields of Mistria українську мову. Встановлюється через
[Mods of Mistria Installer (MOMI)](https://github.com/Garethp/Mods-of-Mistria-Installer).
Репозиторій: https://github.com/Xelanik/mistria-ukrainian · помилки й пропозиції: [Issues](https://github.com/Xelanik/mistria-ukrainian/issues). Спільнота, допомога з установкою, тести й вичитка — на [Discord-сервері FoM-UA](https://discord.gg/QEB9hYBhmm); як допомогти — у [CONTRIBUTING.md](CONTRIBUTING.md).

**Версія мода 0.13.0 ↔ версія гри 1.0.7–1.0.8.**

## Що перекладено (v0.13)

Інтерфейс: меню, налаштування, туторіали з картками, HUD (сезони, дні тижня, календар), крафт і кастомізація,
навички, перки, фестивалі, локації, мешканці (імена й посади), побачення, інфузії, дзвони, тварини.

**Предмети** (назви й описи): культури, насіння, риба, комахи, страви й напої, ковальство й броня, матеріали,
тваринництво, артефакти, меблі всіх наборів, святкові предмети й речі побачень.

**Квести й листи:** усі запити з Дошки запитів (назви, описи, цілі, репліки при здачі), запити Корони, сюжетні квести й
квести симпатії, випробування Стілвелла й Таліферро, 206 листів. Також бонуси навичок, одяг та аксесуари, тварини
(види, масті, прикраси) і набори колекцій Музею.

**Сюжет і місто (0.4):** сюжетні кат-сцени, ремонт і розвиток міста, підписи до речей у світі, підказки печатей, туторіальні репліки, запрошення на свята.

**Весілля й п'ятничні вечори (0.5):** заручини, підготовка до весілля з усіма партнерами, річниці, дні народження гравця й дитини, розставання, щоденні розмови містечка (пляж, сезони, ранок і вечір) і всі п'ятничні вечори в Корчмі.

**Свята (0.6):** Весняне свято, Свято тварин, Свято падаючої зірки, Свято врожаю; розмови після фіналу, міні-сюжети мешканців, розмови про дитину.

**Події симпатії (0.7):** сцени на різних рівнях сердець з усіма дванадцятьма партнерами, освідчення.

**Весілля, діти й групові розмови (0.8):** церемонія й тости з кожним партнером, народження дитини, сон із Великим птахом, понад двісті розмов мешканців між собою.

**Мешканці містечка (0.9):** щоденні репліки 22 мешканців, з якими не можна завести стосунків, реакції на подарунки, розмови про Суботній ринок і експонати Музею, ворожіння Стілвелла.

**Серідія, Балор і Джуніпер (0.10):** щоденні репліки перших трьох партнерів, побачення, вітання після 8 сердець, життя в шлюбі, вагітність і діти, реакції на подарунки.

**Кальдарус, Аделіна й Ейланд (0.11):** щоденні репліки ще трьох партнерів, розмови зі статуєю Кальдаруса на фермі, побачення, вітання після 8 сердець, життя в шлюбі, вагітність і діти, реакції на подарунки.

**Марч, Гейден і Райс (0.12):** щоденні репліки ще трьох партнерів, побачення, вітання після 8 сердець, життя в шлюбі, вагітність і діти, реакції на подарунки.

**Вален, Селіна й Рейна (0.13):** щоденні репліки останніх трьох партнерів, побачення, вітання після 8 сердець, життя в шлюбі, вагітність і діти, реакції на подарунки.

Тепер перекладено весь текст гри (44 158 з 44 159 рядків; лишився один службовий). Переклад — чернетки без повної вичитки; далі — вичитка й тест у грі до версії 1.0.

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
[MOMI](https://github.com/Garethp/Mods-of-Mistria-Installer). Mod 0.13.0 targets game 1.0.7-1.0.8. This release translates the UI
(menus, settings, tutorials, HUD, crafting, perks, locations, NPC names, dates, animals) and all items (names and
descriptions), plus (0.3) quests and the Request Board, 206 letters, skill perks, clothing, animals and Museum sets, and (0.4) the story cutscenes, town repair scenes and world texts, and (0.5) engagement, weddings, anniversaries, birthdays, break-ups and the Friday nights at the Inn, (0.6) the four festivals, (0.7) the heart events, (0.8) weddings, children and group conversations and (0.9) the daily lines, gift reactions, market and Museum comments of the 22 non-romanceable villagers, (0.10) the daily lines, dates, marriage and children of Seridia, Balor and Juniper, (0.11) those of Caldarus (including his statue), Adeline and Eiland, (0.12) those of March, Hayden and Ryis, and (0.13) those of Valen, Celine and Reina, so the whole game text is now translated (draft quality; proofreading and in-game testing come before 1.0). Install: update MOMI, put the
`FoM-UA` folder into `mods/`, enable it in MOMI and pick Ukrainian in the in-game language menu. Do not enable it alongside
another mod that adds the `ukr` language. The startup loading bird stays in English (the engine reads it from a
standalone PNG that stable MOMI 0.16.5 cannot replace). Code is MIT; the translation is CC BY-NC-SA 4.0. The repository contains no
game text or art.
