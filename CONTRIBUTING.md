# Як допомогти проєкту

FoM-UA — неофіційний український переклад Fields of Mistria. Переклад створено за допомогою ШІ й ще не вичитано повністю, тому допомога людей — найцінніше, що тут можна зробити.

## Чим можна допомогти

1. **Повідомити про помилку або дивний переклад.** Достатньо скриншота, місця в грі (меню, діалог, предмет, квест, лист) і версій гри та мода. Створіть [Issue](https://github.com/Xelanik/mistria-ukrainian/issues/new/choose) за шаблоном «Правка перекладу» або «Помилка мода».
2. **Протестувати пробну збірку.** Збірки перед релізом лежать у каналі для тестувальників на [Discord-сервері](https://discord.gg/QEB9hYBhmm).
3. **Вичитати переклад.** Пропонуйте конкретні правки: «як зараз → як краще → чому».
4. **Покращити скрипти чи документацію** (Pull Request).

## Як оформити правку перекладу

- Вкажіть **український текст так, як він показаний у грі**: за ним ми знайдемо рядок.
- Напишіть, як, на вашу думку, краще, і чому: помилка, русизм, неприродно, не вміщається, не за глосарієм, не той рід або «ти/ви».
- Англійський оригінал цитуйте коротко (кілька слів), якщо це потрібно для контексту. Великих шматків тексту гри не вставляйте.
- Перед пропозицією гляньте [`glossary.csv`](glossary.csv) (імена, терміни) і [`STYLE.md`](STYLE.md) (стиль, «ти/ви», рід гравця, заборонені русизми).

## Чого ми не приймаємо

- **Тексти з інших перекладів**: ні з модів на Nexus (зокрема чужого українського перекладу), ні з офіційних локалізацій гри (російської, французької, іспанської та ін.). Ми перекладаємо лише з англійського оригіналу, а чужий переклад не копіюємо й не використовуємо як зразок: це питання авторських прав і принципу проєкту.
- Правки, що ламають теги й змінні: `[Ari]`, `{}`, `<m>…</m>`, маркери виділення `$ = ^ #`. Їх треба зберігати як в оригіналі.
- Російські літери `ё ъ ы э`, символ `…` (замість нього `...`).

## Чому правки перекладу краще подавати через Issue або Discord, а не Pull Request

Файл `translations/uk.jsonl` має ключі й відбитки оригіналу, але без англійського тексту. Перевірити правку (`npm run validate`) можна тільки з локальним `uk.po`, який збирається з вашої копії гри. Тому автор вносить правки сам, а ви лише описуєте їх: це швидше й безпечніше.

Pull Request вітаються для **скриптів і документації**. Для змін у коді: Node 20+, `npm run typecheck` має проходити; код пишемо на TypeScript, без зайвих абстракцій.

## Подяки

Внесники з'являються в `CHANGELOG.md` і на сторінці мода на Nexus, але лише за вашої згоди. Вкажіть у повідомленні, як вас підписати.

## Ліцензії внесків

Переклад і супровідні файли (`uk.jsonl`, `glossary.csv`, `STYLE.md`, `voices.csv`) поширюються за **CC BY-NC-SA 4.0**, код — за **MIT** (див. [`translations/LICENSE.md`](translations/LICENSE.md) і [`LICENSE`](LICENSE)). Надсилаючи правки, ви погоджуєтеся, що вони підпадають під ці ліцензії.

---

## English

This is an unofficial Ukrainian translation of Fields of Mistria. The drafts were produced with AI assistance and are not fully proofread, so human review helps most. Please use the issue templates to report translation problems (quote the Ukrainian text as shown in game, suggest a fix and say why) or mod bugs. Do not copy text from other translations (other mods or the official localizations); translation fixes go through issues rather than pull requests because they can only be validated with a local copy of the game. Pull requests are welcome for scripts and docs. Contributions are licensed CC BY-NC-SA 4.0 (translation) and MIT (code).
