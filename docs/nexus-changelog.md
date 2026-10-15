# Changelog для Nexus Mods

Вкладка Changelogs на сторінці мода: для кожної версії окремий запис (поле Version = номер версії, текст — нижче). Workflow Nexus changelog сам не заповнює, його вставляємо вручну після кожного релізу. Нижче англійський текст (основний для Nexus) і український варіант.

## 0.2.0

**English**
- Added Ukrainian translation of all items (names and descriptions): crops, seeds, fish, bugs, dishes and drinks, tools, armor, materials, ranching products, artifacts and their replicas, all furniture sets, festival, dating and 10-heart items, monster drops. About 6,880 strings in total.
- Renamed "Basic Set" to "Простий набір"; monster names Rock Clod, Ore Clod and Rock Stack now read "Скельна грудка", "Рудна грудка" and "Скельний куб".
- Item translations are drafts and have not had a full proofreading pass; long names may not fit in tooltips.
- Known limitation: the startup loading bird stays in English.
- Game versions 1.0.7-1.0.8. Requires MOMI.

**Українською**
- Перекладено всі предмети (назви й описи): культури, насіння, риба, комахи, страви й напої, інструменти, броня, матеріали, продукти тваринництва, артефакти та їхні копії, усі меблеві набори, святкові предмети, речі побачень і десяти сердець, здобич монстрів. Усього ≈6 880 рядків.
- Зміни назв: «Базовий набір» → «Простий набір»; монстри «Скельна грудка», «Рудна грудка», «Скельний куб».
- Переклад предметів — чернетки без повної вичитки; довгі назви можуть не вміщатися в підказках.
- Обмеження: стартова заставка з птахом лишається англійською.

## 0.1.1

**English**
- Removed the loading-screen sprite files from the mod. Stable MOMI 0.16.5 cannot replace the engine's standalone PNG, and newer MOMI versions would have changed the loading screen for English players too. The startup bird stays in English.
- Documentation fixes (language is picked in the in-game language menu; game versions 1.0.7-1.0.8). Translation unchanged.

**Українською**
- З мода прибрано файли стартової заставки (стабільний MOMI 0.16.5 не може підмінити її PNG, а новіший MOMI змінив би заставку й англомовним гравцям). Заставка лишається англійською.
- Виправлено документацію. Переклад не змінено.

## 0.1.0

**English**
- First public release: Ukrainian UI translation (about 1,450 strings): menus, settings, tutorials and tutorial cards, HUD (seasons, weekdays, calendar), crafting and customization, skills, perks, festivals, locations, NPC names and jobs, dates, infusions, bells, animals.
- Ukrainian labels for level and crit sprites; a small GML hook adds Ukrainian to older saves (prevents a crash in character customization).
- Untranslated text stays in English. Requires MOMI.

**Українською**
- Перший публічний реліз: переклад інтерфейсу (≈1 450 рядків): меню, налаштування, туторіали з картками, HUD (сезони, дні тижня, календар), крафт і кастомізація, навички, перки, фестивалі, локації, імена й посади мешканців, побачення, інфузії, дзвони, тварини.
- Українські мітки «Рів.» і «Крит»; невеликий GML-хук додає українську до старих збережень (інакше кастомізація персонажа падає).
- Усе, що не перекладено, гра показує англійською.
