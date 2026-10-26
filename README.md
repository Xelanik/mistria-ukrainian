# FoM-UA — українська локалізація Fields of Mistria

Неофіційний фанатський мод, що додає в Fields of Mistria українську мову. Встановлюється через
[Mods of Mistria Installer (MOMI)](https://github.com/Garethp/Mods-of-Mistria-Installer).
Репозиторій: https://github.com/Xelanik/mistria-ukrainian · помилки й пропозиції: [Issues](https://github.com/Xelanik/mistria-ukrainian/issues). Спільнота, допомога з установкою, тести й вичитка — на [Discord-сервері FoM-UA](https://discord.gg/QEB9hYBhmm); як допомогти — у [CONTRIBUTING.md](CONTRIBUTING.md).

**Версія мода 0.14.0 ↔ версія гри 1.0.7–1.0.8.**

## Що перекладено

Весь текст гри (44 158 з 44 159 рядків; лишився один службовий): інтерфейс, предмети, квести й листи, сюжет і ремонт
міста, свята, події симпатії, весілля й діти, групові розмови, щоденні репліки всіх мешканців і дванадцяти партнерів.
Туторіальні картки, календар, сезони й мітки «Рів.» і «Крит» теж українською. Що додавала кожна версія — у
[CHANGELOG.md](CHANGELOG.md).

## Що далі

- Вичитка перекладу й правки від спільноти: помилки, незграбні фрази, неузгоджені терміни — пишіть у
  [Issues](https://github.com/Xelanik/mistria-ukrainian/issues) чи [Discord](https://discord.gg/QEB9hYBhmm),
  виправлення виходять у наступних версіях.
- Тест у грі кожного типу тексту (переноси, довгі рядки на кнопках).
- Версія 1.0 — після вичитки й тесту.

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
[MOMI](https://github.com/Garethp/Mods-of-Mistria-Installer). Mod 0.14.0 targets game 1.0.7-1.0.8. The whole game text is translated: UI, items, quests and letters, the story, festivals, heart events, weddings and children, and the daily lines of every villager and romanceable character (draft quality; next come proofreading, community fixes and in-game testing before 1.0). Install: update MOMI, put the
`FoM-UA` folder into `mods/`, enable it in MOMI and pick Ukrainian in the in-game language menu. Do not enable it alongside
another mod that adds the `ukr` language. The startup loading bird stays in English (the engine reads it from a
standalone PNG that stable MOMI 0.16.5 cannot replace). Code is MIT; the translation is CC BY-NC-SA 4.0. The repository contains no
game text or art.
