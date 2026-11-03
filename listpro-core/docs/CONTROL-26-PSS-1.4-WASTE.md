# Brain 1.4 — PANEL_SAW_STAGED (PSS)

**На одном листе допустимый PSS-план не найден.** Все 26 деталей размещены на 2 листах. Это не доказательство минимальности.

![Общая карта](../benchmarks/manual-26-pss-1.4-waste-map.svg)

![Первичные полосы](../benchmarks/manual-26-pss-1.4-waste-primary.svg)

[Дерево всех заготовок](../benchmarks/manual-26-pss-1.4-waste-blanks.svg) · [JSON](../benchmarks/manual-26-pss-1.4-waste.json)

Режим PANEL_SAW_STAGED, профиль pss-anchored-single-axis-v1. Геометрия, физическая последовательность и роли/якоря проверены независимо. Профиль абстрактный, применимость к реальному станку и БАЗИС не подтверждена.

Если выбранная ось этого требует, выполняется разрешённый предварительный поворот сырого листа; затем вся серия параллельных резов по основному остатку. Рабочие полосы снимаются с высокой стороны поперечной координаты; низкая часть остаётся PRIMARY_REMAINDER. endPrimary роли не меняет. Ширина каждой рабочей полосы равна одному реальному ведущему экземпляру; припуск 0. После каждого CUT новые дети имеют turnCount=0.

## Первичные полосы и якоря

| Лист | Полоса | Ось материала | Ширина | Якорь | Blank | Конверсия последнего остатка |
|---:|---:|---|---:|---|---|---|
| 1 | 1 | H | 398 | 4:1 | B007 | нет, физически отделена CUT |
| 1 | 2 | H | 723 | 1:1 | B009 | нет, физически отделена CUT |
| 1 | 3 | H | 394 | 5:1 | B011 | нет, физически отделена CUT |
| 1 | 4 | H | 270 | 8:1 | B013 | нет, физически отделена CUT |
| 2 | 1 | V | 238 | 9:3 | B094 | нет, физически отделена CUT |

## Последующий раскрой каждой полосы

Лист 1, полоса 1: реальный якорь 4:1 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.4-waste-strip-1-1.svg)

Лист 1, полоса 2: реальный якорь 1:1 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.4-waste-strip-1-2.svg)

Лист 1, полоса 3: реальный якорь 5:1 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.4-waste-strip-1-3.svg)

Лист 1, полоса 4: реальный якорь 8:1 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.4-waste-strip-1-4.svg)

Лист 2, полоса 1: реальный якорь 9:3 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.4-waste-strip-2-1.svg)

## Все операции

Машинные координаты локальные для поданной заготовки, V=x const. Материальные координаты неизменны. Поворот исходного листа, если он нужен, выполняется только до первого реза. CUT №, шаги и номера деталей независимы.

| Шаг | Действие | CUT № | Вход | Роль | Размер / ориентация | Машинный рез | Выходы |
|---:|---|---:|---|---|---|---|---|
| 1 | load | — | B001 | PRIMARY_PANEL | 2750×1830 / 0° | — |  |
| 2 | ROTATE_90 | — | B001 | PRIMARY_PANEL | 1830×2750 / 0→90° | 90°; 0→1 | B001 |
| 3 | CUT | 1 | B001 | PRIMARY_PANEL | 1830×2750 / 90° | V: (1820,0)→(1820,2750) | B003, B002 |
| 4 | feed | — | B003 | PRIMARY_REMAINDER | 1820×2750 / 90° | — |  |
| 5 | CUT | 2 | B003 | PRIMARY_REMAINDER | 1820×2750 / 90° | V: (5,0)→(5,2750) | B005, B004 |
| 6 | feed | — | B004 | PRIMARY_REMAINDER | 1810×2750 / 90° | — |  |
| 7 | CUT | 3 | B004 | PRIMARY_REMAINDER | 1810×2750 / 90° | V: (398,0)→(398,2750) | B007, B006 |
| 8 | feed | — | B006 | PRIMARY_REMAINDER | 1407×2750 / 90° | — |  |
| 9 | CUT | 4 | B006 | PRIMARY_REMAINDER | 1407×2750 / 90° | V: (723,0)→(723,2750) | B009, B008 |
| 10 | feed | — | B008 | PRIMARY_REMAINDER | 679×2750 / 90° | — |  |
| 11 | CUT | 5 | B008 | PRIMARY_REMAINDER | 679×2750 / 90° | V: (394,0)→(394,2750) | B011, B010 |
| 12 | feed | — | B010 | PRIMARY_REMAINDER | 280×2750 / 90° | — |  |
| 13 | CUT | 6 | B010 | PRIMARY_REMAINDER | 280×2750 / 90° | V: (270,0)→(270,2750) | B013, B012 |
| 14 | endPrimary | — | лист 1 | — | — / —° | — | B007, B009, B011, B013 |
| 15 | feed | — | B007 | DETACHED_PRIMARY_STRIP | 398×2750 / 90° | — |  |
| 16 | ROTATE_90 | — | B007 | DETACHED_PRIMARY_STRIP | 2750×398 / 90→180° | 90°; 0→1 | B007 |
| 17 | CUT | 7 | B007 | DETACHED_PRIMARY_STRIP | 2750×398 / 180° | V: (2740,0)→(2740,398) | B015, B014 |
| 18 | feed | — | B015 | SECONDARY_BLANK | 2740×398 / 180° | — |  |
| 19 | CUT | 8 | B015 | SECONDARY_BLANK | 2740×398 / 180° | V: (5,0)→(5,398) | B017, B016 |
| 20 | feed | — | B016 | SECONDARY_BLANK | 2730×398 / 180° | — |  |
| 21 | CUT | 9 | B016 | SECONDARY_BLANK | 2730×398 / 180° | V: (1759,0)→(1759,398) | B019, B018 |
| 22 | feed | — | B019 | SECONDARY_BLANK | 1759×398 / 180° | — |  |
| 23 | CUT | 10 | B019 | SECONDARY_BLANK | 1759×398 / 180° | V: (320,0)→(320,398) | B021, B020 |
| 24 | feed | — | B020 | SECONDARY_BLANK | 1434×398 / 180° | — |  |
| 25 | CUT | 11 | B020 | SECONDARY_BLANK | 1434×398 / 180° | V: (297,0)→(297,398) | B023, B022 |
| 26 | feed | — | B023 | SECONDARY_BLANK | 297×398 / 180° | — |  |
| 27 | ROTATE_90 | — | B023 | SECONDARY_BLANK | 398×297 / 180→270° | 90°; 0→1 | B023 |
| 28 | CUT | 12 | B023 | SECONDARY_BLANK | 398×297 / 270° | V: (297,0)→(297,297) | B024, B025 |
| 29 | feed | — | B021 | SECONDARY_BLANK | 320×398 / 180° | — |  |
| 30 | CUT | 13 | B021 | SECONDARY_BLANK | 320×398 / 180° | V: (77,0)→(77,398) | B027, B026 |
| 31 | feed | — | B026 | SECONDARY_BLANK | 238×398 / 180° | — |  |
| 32 | ROTATE_90 | — | B026 | SECONDARY_BLANK | 398×238 / 180→270° | 90°; 0→1 | B026 |
| 33 | CUT | 14 | B026 | SECONDARY_BLANK | 398×238 / 270° | V: (365,0)→(365,238) | B028, B029 |
| 34 | feed | — | B028 | SECONDARY_BLANK | 365×238 / 270° | — |  |
| 35 | CUT | 15 | B028 | SECONDARY_BLANK | 365×238 / 270° | V: (180,0)→(180,238) | B030, B031 |
| 36 | feed | — | B009 | DETACHED_PRIMARY_STRIP | 723×2750 / 90° | — |  |
| 37 | ROTATE_90 | — | B009 | DETACHED_PRIMARY_STRIP | 2750×723 / 90→180° | 90°; 0→1 | B009 |
| 38 | CUT | 16 | B009 | DETACHED_PRIMARY_STRIP | 2750×723 / 180° | V: (2740,0)→(2740,723) | B033, B032 |
| 39 | feed | — | B033 | SECONDARY_BLANK | 2740×723 / 180° | — |  |
| 40 | CUT | 17 | B033 | SECONDARY_BLANK | 2740×723 / 180° | V: (5,0)→(5,723) | B035, B034 |
| 41 | feed | — | B034 | SECONDARY_BLANK | 2730×723 / 180° | — |  |
| 42 | CUT | 18 | B034 | SECONDARY_BLANK | 2730×723 / 180° | V: (1759,0)→(1759,723) | B037, B036 |
| 43 | feed | — | B037 | SECONDARY_BLANK | 1759×723 / 180° | — |  |
| 44 | ROTATE_90 | — | B037 | SECONDARY_BLANK | 723×1759 / 180→270° | 90°; 0→1 | B037 |
| 45 | CUT | 19 | B037 | SECONDARY_BLANK | 723×1759 / 270° | V: (622,0)→(622,1759) | B038, B039 |
| 46 | feed | — | B038 | SECONDARY_BLANK | 622×1759 / 270° | — |  |
| 47 | ROTATE_90 | — | B038 | SECONDARY_BLANK | 1759×622 / 270→0° | 90°; 0→1 | B038 |
| 48 | CUT | 20 | B038 | SECONDARY_BLANK | 1759×622 / 0° | V: (1736,0)→(1736,622) | B040, B041 |
| 49 | feed | — | B040 | SECONDARY_BLANK | 1736×622 / 0° | — |  |
| 50 | CUT | 21 | B040 | SECONDARY_BLANK | 1736×622 / 0° | V: (1132,0)→(1132,622) | B042, B043 |
| 51 | feed | — | B042 | SECONDARY_BLANK | 1132×622 / 0° | — |  |
| 52 | ROTATE_90 | — | B042 | SECONDARY_BLANK | 622×1132 / 0→90° | 90°; 0→1 | B042 |
| 53 | CUT | 22 | B042 | SECONDARY_BLANK | 622×1132 / 90° | V: (219,0)→(219,1132) | B045, B044 |
| 54 | feed | — | B045 | SECONDARY_BLANK | 219×1132 / 90° | — |  |
| 55 | ROTATE_90 | — | B045 | SECONDARY_BLANK | 1132×219 / 90→180° | 90°; 0→1 | B045 |
| 56 | CUT | 23 | B045 | SECONDARY_BLANK | 1132×219 / 180° | V: (127,0)→(127,219) | B047, B046 |
| 57 | feed | — | B043 | SECONDARY_BLANK | 599×622 / 0° | — |  |
| 58 | ROTATE_90 | — | B043 | SECONDARY_BLANK | 622×599 / 0→90° | 90°; 0→1 | B043 |
| 59 | CUT | 24 | B043 | SECONDARY_BLANK | 622×599 / 90° | V: (18,0)→(18,599) | B049, B048 |
| 60 | feed | — | B048 | SECONDARY_BLANK | 599×599 / 90° | — |  |
| 61 | CUT | 25 | B048 | SECONDARY_BLANK | 599×599 / 90° | V: (297,0)→(297,599) | B051, B050 |
| 62 | feed | — | B050 | SECONDARY_BLANK | 297×599 / 90° | — |  |
| 63 | ROTATE_90 | — | B050 | SECONDARY_BLANK | 599×297 / 90→180° | 90°; 0→1 | B050 |
| 64 | CUT | 26 | B050 | SECONDARY_BLANK | 599×297 / 180° | V: (297,0)→(297,297) | B053, B052 |
| 65 | feed | — | B051 | SECONDARY_BLANK | 297×599 / 90° | — |  |
| 66 | ROTATE_90 | — | B051 | SECONDARY_BLANK | 599×297 / 90→180° | 90°; 0→1 | B051 |
| 67 | CUT | 27 | B051 | SECONDARY_BLANK | 599×297 / 180° | V: (297,0)→(297,297) | B055, B054 |
| 68 | feed | — | B011 | DETACHED_PRIMARY_STRIP | 394×2750 / 90° | — |  |
| 69 | ROTATE_90 | — | B011 | DETACHED_PRIMARY_STRIP | 2750×394 / 90→180° | 90°; 0→1 | B011 |
| 70 | CUT | 28 | B011 | DETACHED_PRIMARY_STRIP | 2750×394 / 180° | V: (2740,0)→(2740,394) | B057, B056 |
| 71 | feed | — | B057 | SECONDARY_BLANK | 2740×394 / 180° | — |  |
| 72 | CUT | 29 | B057 | SECONDARY_BLANK | 2740×394 / 180° | V: (5,0)→(5,394) | B059, B058 |
| 73 | feed | — | B058 | SECONDARY_BLANK | 2730×394 / 180° | — |  |
| 74 | CUT | 30 | B058 | SECONDARY_BLANK | 2730×394 / 180° | V: (1759,0)→(1759,394) | B061, B060 |
| 75 | feed | — | B061 | SECONDARY_BLANK | 1759×394 / 180° | — |  |
| 76 | ROTATE_90 | — | B061 | SECONDARY_BLANK | 394×1759 / 180→270° | 90°; 0→1 | B061 |
| 77 | CUT | 31 | B061 | SECONDARY_BLANK | 394×1759 / 270° | V: (270,0)→(270,1759) | B062, B063 |
| 78 | feed | — | B062 | SECONDARY_BLANK | 270×1759 / 270° | — |  |
| 79 | ROTATE_90 | — | B062 | SECONDARY_BLANK | 1759×270 / 270→0° | 90°; 0→1 | B062 |
| 80 | CUT | 32 | B062 | SECONDARY_BLANK | 1759×270 / 0° | V: (1695,0)→(1695,270) | B064, B065 |
| 81 | feed | — | B064 | SECONDARY_BLANK | 1695×270 / 0° | — |  |
| 82 | CUT | 33 | B064 | SECONDARY_BLANK | 1695×270 / 0° | V: (420,0)→(420,270) | B066, B067 |
| 83 | feed | — | B067 | SECONDARY_BLANK | 1270×270 / 0° | — |  |
| 84 | CUT | 34 | B067 | SECONDARY_BLANK | 1270×270 / 0° | V: (420,0)→(420,270) | B068, B069 |
| 85 | feed | — | B069 | SECONDARY_BLANK | 845×270 / 0° | — |  |
| 86 | CUT | 35 | B069 | SECONDARY_BLANK | 845×270 / 0° | V: (420,0)→(420,270) | B070, B071 |
| 87 | feed | — | B013 | DETACHED_PRIMARY_STRIP | 270×2750 / 90° | — |  |
| 88 | ROTATE_90 | — | B013 | DETACHED_PRIMARY_STRIP | 2750×270 / 90→180° | 90°; 0→1 | B013 |
| 89 | CUT | 36 | B013 | DETACHED_PRIMARY_STRIP | 2750×270 / 180° | V: (2740,0)→(2740,270) | B073, B072 |
| 90 | feed | — | B073 | SECONDARY_BLANK | 2740×270 / 180° | — |  |
| 91 | CUT | 37 | B073 | SECONDARY_BLANK | 2740×270 / 180° | V: (5,0)→(5,270) | B075, B074 |
| 92 | feed | — | B074 | SECONDARY_BLANK | 2730×270 / 180° | — |  |
| 93 | CUT | 38 | B074 | SECONDARY_BLANK | 2730×270 / 180° | V: (2305,0)→(2305,270) | B077, B076 |
| 94 | feed | — | B077 | SECONDARY_BLANK | 2305×270 / 180° | — |  |
| 95 | CUT | 39 | B077 | SECONDARY_BLANK | 2305×270 / 180° | V: (180,0)→(180,270) | B079, B078 |
| 96 | feed | — | B078 | SECONDARY_BLANK | 2120×270 / 180° | — |  |
| 97 | CUT | 40 | B078 | SECONDARY_BLANK | 2120×270 / 180° | V: (1695,0)→(1695,270) | B081, B080 |
| 98 | feed | — | B081 | SECONDARY_BLANK | 1695×270 / 180° | — |  |
| 99 | CUT | 41 | B081 | SECONDARY_BLANK | 1695×270 / 180° | V: (1270,0)→(1270,270) | B083, B082 |
| 100 | feed | — | B083 | SECONDARY_BLANK | 1270×270 / 180° | — |  |
| 101 | CUT | 42 | B083 | SECONDARY_BLANK | 1270×270 / 180° | V: (845,0)→(845,270) | B085, B084 |
| 102 | feed | — | B085 | SECONDARY_BLANK | 845×270 / 180° | — |  |
| 103 | CUT | 43 | B085 | SECONDARY_BLANK | 845×270 / 180° | V: (420,0)→(420,270) | B087, B086 |
| 104 | load | — | B088 | PRIMARY_PANEL | 2750×1830 / 0° | — |  |
| 105 | CUT | 44 | B088 | PRIMARY_PANEL | 2750×1830 / 0° | V: (5,0)→(5,1830) | B089, B090 |
| 106 | feed | — | B090 | PRIMARY_REMAINDER | 2740×1830 / 0° | — |  |
| 107 | CUT | 45 | B090 | PRIMARY_REMAINDER | 2740×1830 / 0° | V: (2730,0)→(2730,1830) | B091, B092 |
| 108 | feed | — | B091 | PRIMARY_REMAINDER | 2730×1830 / 0° | — |  |
| 109 | CUT | 46 | B091 | PRIMARY_REMAINDER | 2730×1830 / 0° | V: (2487,0)→(2487,1830) | B093, B094 |
| 110 | endPrimary | — | лист 2 | — | — / —° | — | B094 |
| 111 | feed | — | B094 | DETACHED_PRIMARY_STRIP | 238×1830 / 0° | — |  |
| 112 | ROTATE_90 | — | B094 | DETACHED_PRIMARY_STRIP | 1830×238 / 0→90° | 90°; 0→1 | B094 |
| 113 | CUT | 47 | B094 | DETACHED_PRIMARY_STRIP | 1830×238 / 90° | V: (1820,0)→(1820,238) | B096, B095 |
| 114 | feed | — | B096 | SECONDARY_BLANK | 1820×238 / 90° | — |  |
| 115 | CUT | 48 | B096 | SECONDARY_BLANK | 1820×238 / 90° | V: (5,0)→(5,238) | B098, B097 |
| 116 | feed | — | B097 | SECONDARY_BLANK | 1810×238 / 90° | — |  |
| 117 | CUT | 49 | B097 | SECONDARY_BLANK | 1810×238 / 90° | V: (1625,0)→(1625,238) | B100, B099 |
| 118 | feed | — | B100 | SECONDARY_BLANK | 1625×238 / 90° | — |  |
| 119 | CUT | 50 | B100 | SECONDARY_BLANK | 1625×238 / 90° | V: (1440,0)→(1440,238) | B102, B101 |
| 120 | feed | — | B102 | SECONDARY_BLANK | 1440×238 / 90° | — |  |
| 121 | CUT | 51 | B102 | SECONDARY_BLANK | 1440×238 / 90° | V: (1255,0)→(1255,238) | B104, B103 |

## Роли и родословная всех заготовок

| B | Родитель | blankId | Материал X,Y,W,H | Роль при создании → итог | Машинная ориентация | turnCount |
|---|---|---|---|---|---|---:|
| B001 | — | s0/raw | 0, 0, 2750, 1830 | PRIMARY_PANEL → PRIMARY_PANEL | 0→90° | 1 |
| B002 | B001 | s0/side-low | 0, 0, 2750, 5 | WASTE → WASTE | 90→90° | 0 |
| B003 | B001 | s0/main0 | 0, 10, 2750, 1820 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 90→90° | 0 |
| B004 | B003 | s0/main1 | 0, 10, 2750, 1810 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 90→90° | 0 |
| B005 | B003 | s0/side-high | 0, 1825, 2750, 5 | WASTE → WASTE | 90→90° | 0 |
| B006 | B004 | s0/remainder0 | 0, 10, 2750, 1407 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 90→90° | 0 |
| B007 | B004 | s0/strip1 | 0, 1422, 2750, 398 | DETACHED_PRIMARY_STRIP → DETACHED_PRIMARY_STRIP | 90→180° | 1 |
| B008 | B006 | s0/remainder1 | 0, 10, 2750, 679 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 90→90° | 0 |
| B009 | B006 | s0/strip2 | 0, 694, 2750, 723 | DETACHED_PRIMARY_STRIP → DETACHED_PRIMARY_STRIP | 90→180° | 1 |
| B010 | B008 | s0/remainder2 | 0, 10, 2750, 280 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 90→90° | 0 |
| B011 | B008 | s0/strip3 | 0, 295, 2750, 394 | DETACHED_PRIMARY_STRIP → DETACHED_PRIMARY_STRIP | 90→180° | 1 |
| B012 | B010 | s0/remainder3 | 0, 10, 2750, 5 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 90→90° | 0 |
| B013 | B010 | s0/strip4 | 0, 20, 2750, 270 | DETACHED_PRIMARY_STRIP → DETACHED_PRIMARY_STRIP | 90→180° | 1 |
| B014 | B007 | s0/strip1/end-low | 0, 1422, 5, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B015 | B007 | s0/strip1/after-low | 10, 1422, 2740, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B016 | B015 | s0/strip1/work | 10, 1422, 2730, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B017 | B015 | s0/strip1/end-high | 2745, 1422, 5, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B018 | B016 | s0/strip1/work/0 | 10, 1422, 966, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B019 | B016 | s0/strip1/work/1 | 981, 1422, 1759, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B020 | B019 | s0/strip1/work/1/0 | 981, 1422, 1434, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B021 | B019 | s0/strip1/work/1/1 | 2420, 1422, 320, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B022 | B020 | s0/strip1/work/1/0/0 | 981, 1422, 1132, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B023 | B020 | s0/strip1/work/1/0/1 | 2118, 1422, 297, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→270° | 1 |
| B024 | B023 | s0/strip1/work/1/0/1/0 | 2118, 1422, 297, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B025 | B023 | s0/strip1/work/1/0/1/1 | 2118, 1724, 297, 96 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B026 | B021 | s0/strip1/work/1/1/0 | 2420, 1422, 238, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→270° | 1 |
| B027 | B021 | s0/strip1/work/1/1/1 | 2663, 1422, 77, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B028 | B026 | s0/strip1/work/1/1/0/0 | 2420, 1422, 238, 365 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B029 | B026 | s0/strip1/work/1/1/0/1 | 2420, 1792, 238, 28 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B030 | B028 | s0/strip1/work/1/1/0/0/0 | 2420, 1422, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B031 | B028 | s0/strip1/work/1/1/0/0/1 | 2420, 1607, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B032 | B009 | s0/strip2/end-low | 0, 694, 5, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B033 | B009 | s0/strip2/after-low | 10, 694, 2740, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B034 | B033 | s0/strip2/work | 10, 694, 2730, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B035 | B033 | s0/strip2/end-high | 2745, 694, 5, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B036 | B034 | s0/strip2/work/0 | 10, 694, 966, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B037 | B034 | s0/strip2/work/1 | 981, 694, 1759, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→270° | 1 |
| B038 | B037 | s0/strip2/work/1/0 | 981, 694, 1759, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 270→0° | 1 |
| B039 | B037 | s0/strip2/work/1/1 | 981, 1321, 1759, 96 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B040 | B038 | s0/strip2/work/1/0/0 | 981, 694, 1736, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B041 | B038 | s0/strip2/work/1/0/1 | 2722, 694, 18, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B042 | B040 | s0/strip2/work/1/0/0/0 | 981, 694, 1132, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 0→90° | 1 |
| B043 | B040 | s0/strip2/work/1/0/0/1 | 2118, 694, 599, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 0→90° | 1 |
| B044 | B042 | s0/strip2/work/1/0/0/0/0 | 981, 694, 1132, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B045 | B042 | s0/strip2/work/1/0/0/0/1 | 981, 1097, 1132, 219 | SECONDARY_BLANK → SECONDARY_BLANK | 90→180° | 1 |
| B046 | B045 | s0/strip2/work/1/0/0/0/1/0 | 981, 1097, 1000, 219 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B047 | B045 | s0/strip2/work/1/0/0/0/1/1 | 1986, 1097, 127, 219 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B048 | B043 | s0/strip2/work/1/0/0/1/0 | 2118, 694, 599, 599 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B049 | B043 | s0/strip2/work/1/0/0/1/1 | 2118, 1298, 599, 18 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B050 | B048 | s0/strip2/work/1/0/0/1/0/0 | 2118, 694, 599, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 90→180° | 1 |
| B051 | B048 | s0/strip2/work/1/0/0/1/0/1 | 2118, 996, 599, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 90→180° | 1 |
| B052 | B050 | s0/strip2/work/1/0/0/1/0/0/0 | 2118, 694, 297, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B053 | B050 | s0/strip2/work/1/0/0/1/0/0/1 | 2420, 694, 297, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B054 | B051 | s0/strip2/work/1/0/0/1/0/1/0 | 2118, 996, 297, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B055 | B051 | s0/strip2/work/1/0/0/1/0/1/1 | 2420, 996, 297, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B056 | B011 | s0/strip3/end-low | 0, 295, 5, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B057 | B011 | s0/strip3/after-low | 10, 295, 2740, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B058 | B057 | s0/strip3/work | 10, 295, 2730, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B059 | B057 | s0/strip3/end-high | 2745, 295, 5, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B060 | B058 | s0/strip3/work/0 | 10, 295, 966, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B061 | B058 | s0/strip3/work/1 | 981, 295, 1759, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→270° | 1 |
| B062 | B061 | s0/strip3/work/1/0 | 981, 295, 1759, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 270→0° | 1 |
| B063 | B061 | s0/strip3/work/1/1 | 981, 570, 1759, 119 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B064 | B062 | s0/strip3/work/1/0/0 | 981, 295, 1695, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B065 | B062 | s0/strip3/work/1/0/1 | 2681, 295, 59, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B066 | B064 | s0/strip3/work/1/0/0/0 | 981, 295, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B067 | B064 | s0/strip3/work/1/0/0/1 | 1406, 295, 1270, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B068 | B067 | s0/strip3/work/1/0/0/1/0 | 1406, 295, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B069 | B067 | s0/strip3/work/1/0/0/1/1 | 1831, 295, 845, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B070 | B069 | s0/strip3/work/1/0/0/1/1/0 | 1831, 295, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B071 | B069 | s0/strip3/work/1/0/0/1/1/1 | 2256, 295, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B072 | B013 | s0/strip4/end-low | 0, 20, 5, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B073 | B013 | s0/strip4/after-low | 10, 20, 2740, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B074 | B073 | s0/strip4/work | 10, 20, 2730, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B075 | B073 | s0/strip4/end-high | 2745, 20, 5, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B076 | B074 | s0/strip4/work/0 | 10, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B077 | B074 | s0/strip4/work/1 | 435, 20, 2305, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B078 | B077 | s0/strip4/work/1/0 | 435, 20, 2120, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B079 | B077 | s0/strip4/work/1/1 | 2560, 20, 180, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B080 | B078 | s0/strip4/work/1/0/0 | 435, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B081 | B078 | s0/strip4/work/1/0/1 | 860, 20, 1695, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B082 | B081 | s0/strip4/work/1/0/1/0 | 860, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B083 | B081 | s0/strip4/work/1/0/1/1 | 1285, 20, 1270, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B084 | B083 | s0/strip4/work/1/0/1/1/0 | 1285, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B085 | B083 | s0/strip4/work/1/0/1/1/1 | 1710, 20, 845, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B086 | B085 | s0/strip4/work/1/0/1/1/1/0 | 1710, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B087 | B085 | s0/strip4/work/1/0/1/1/1/1 | 2135, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B088 | — | s1/raw | 0, 0, 2750, 1830 | PRIMARY_PANEL → PRIMARY_PANEL | 0→0° | 0 |
| B089 | B088 | s1/side-low | 0, 0, 5, 1830 | WASTE → WASTE | 0→0° | 0 |
| B090 | B088 | s1/main0 | 10, 0, 2740, 1830 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 0→0° | 0 |
| B091 | B090 | s1/main1 | 10, 0, 2730, 1830 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 0→0° | 0 |
| B092 | B090 | s1/side-high | 2745, 0, 5, 1830 | WASTE → WASTE | 0→0° | 0 |
| B093 | B091 | s1/remainder0 | 10, 0, 2487, 1830 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 0→0° | 0 |
| B094 | B091 | s1/strip1 | 2502, 0, 238, 1830 | DETACHED_PRIMARY_STRIP → DETACHED_PRIMARY_STRIP | 0→90° | 1 |
| B095 | B094 | s1/strip1/end-low | 2502, 0, 238, 5 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B096 | B094 | s1/strip1/after-low | 2502, 10, 238, 1820 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B097 | B096 | s1/strip1/work | 2502, 10, 238, 1810 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B098 | B096 | s1/strip1/end-high | 2502, 1825, 238, 5 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B099 | B097 | s1/strip1/work/0 | 2502, 10, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B100 | B097 | s1/strip1/work/1 | 2502, 195, 238, 1625 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B101 | B100 | s1/strip1/work/1/0 | 2502, 195, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B102 | B100 | s1/strip1/work/1/1 | 2502, 380, 238, 1440 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B103 | B102 | s1/strip1/work/1/1/0 | 2502, 380, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B104 | B102 | s1/strip1/work/1/1/1 | 2502, 565, 238, 1255 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |

## Метрики

51 рез, 40837 мм, 17 поворотов (включая предварительные повороты листов), 121 операций. Включены реальные обрезки кромок; необработанный основной остаток не торцуется и не разворачивается. Полные размеры деталей, отдельные отходы, профили и replay находятся в JSON.
