# Brain 1.3 — PANEL_SAW_STAGED (PSS)

**На одном листе допустимый PSS-план не найден.** Все 26 деталей размещены на 2 листах. Это не доказательство минимальности.

![Общая карта](../benchmarks/manual-26-pss-1.3-map.svg)

![Первичные полосы](../benchmarks/manual-26-pss-1.3-primary.svg)

[Дерево всех заготовок](../benchmarks/manual-26-pss-1.3-blanks.svg) · [JSON](../benchmarks/manual-26-pss-1.3.json)

Режим PANEL_SAW_STAGED, профиль pss-anchored-single-axis-v1. Геометрия, физическая последовательность и роли/якоря проверены независимо. Профиль абстрактный, применимость к реальному станку и БАЗИС не подтверждена.

Если выбранная ось этого требует, выполняется разрешённый предварительный поворот сырого листа; затем вся серия параллельных резов по основному остатку. Рабочие полосы снимаются с высокой стороны поперечной координаты; низкая часть остаётся PRIMARY_REMAINDER. endPrimary роли не меняет. Ширина каждой рабочей полосы равна одному реальному ведущему экземпляру; припуск 0. После каждого CUT новые дети имеют turnCount=0.

## Первичные полосы и якоря

| Лист | Полоса | Ось материала | Ширина | Якорь | Blank | Конверсия последнего остатка |
|---:|---:|---|---:|---|---|---|
| 1 | 1 | H | 398 | 4:1 | B007 | нет, физически отделена CUT |
| 1 | 2 | H | 723 | 1:1 | B009 | нет, физически отделена CUT |
| 1 | 3 | H | 394 | 5:1 | B011 | нет, физически отделена CUT |
| 1 | 4 | H | 270 | 8:1 | B013 | нет, физически отделена CUT |
| 2 | 1 | V | 238 | 9:1 | B088 | нет, физически отделена CUT |

## Последующий раскрой каждой полосы

Лист 1, полоса 1: реальный якорь 4:1 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.3-strip-1-1.svg)

Лист 1, полоса 2: реальный якорь 1:1 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.3-strip-1-2.svg)

Лист 1, полоса 3: реальный якорь 5:1 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.3-strip-1-3.svg)

Лист 1, полоса 4: реальный якорь 8:1 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.3-strip-1-4.svg)

Лист 2, полоса 1: реальный якорь 9:1 первым; остальные детали находятся за ним по длине.

![Полоса](../benchmarks/manual-26-pss-1.3-strip-2-1.svg)

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
| 29 | feed | — | B009 | DETACHED_PRIMARY_STRIP | 723×2750 / 90° | — |  |
| 30 | ROTATE_90 | — | B009 | DETACHED_PRIMARY_STRIP | 2750×723 / 90→180° | 90°; 0→1 | B009 |
| 31 | CUT | 13 | B009 | DETACHED_PRIMARY_STRIP | 2750×723 / 180° | V: (2740,0)→(2740,723) | B027, B026 |
| 32 | feed | — | B027 | SECONDARY_BLANK | 2740×723 / 180° | — |  |
| 33 | CUT | 14 | B027 | SECONDARY_BLANK | 2740×723 / 180° | V: (5,0)→(5,723) | B029, B028 |
| 34 | feed | — | B028 | SECONDARY_BLANK | 2730×723 / 180° | — |  |
| 35 | CUT | 15 | B028 | SECONDARY_BLANK | 2730×723 / 180° | V: (1759,0)→(1759,723) | B031, B030 |
| 36 | feed | — | B031 | SECONDARY_BLANK | 1759×723 / 180° | — |  |
| 37 | ROTATE_90 | — | B031 | SECONDARY_BLANK | 723×1759 / 180→270° | 90°; 0→1 | B031 |
| 38 | CUT | 16 | B031 | SECONDARY_BLANK | 723×1759 / 270° | V: (622,0)→(622,1759) | B032, B033 |
| 39 | feed | — | B032 | SECONDARY_BLANK | 622×1759 / 270° | — |  |
| 40 | ROTATE_90 | — | B032 | SECONDARY_BLANK | 1759×622 / 270→0° | 90°; 0→1 | B032 |
| 41 | CUT | 17 | B032 | SECONDARY_BLANK | 1759×622 / 0° | V: (1736,0)→(1736,622) | B034, B035 |
| 42 | feed | — | B034 | SECONDARY_BLANK | 1736×622 / 0° | — |  |
| 43 | CUT | 18 | B034 | SECONDARY_BLANK | 1736×622 / 0° | V: (1132,0)→(1132,622) | B036, B037 |
| 44 | feed | — | B036 | SECONDARY_BLANK | 1132×622 / 0° | — |  |
| 45 | ROTATE_90 | — | B036 | SECONDARY_BLANK | 622×1132 / 0→90° | 90°; 0→1 | B036 |
| 46 | CUT | 19 | B036 | SECONDARY_BLANK | 622×1132 / 90° | V: (219,0)→(219,1132) | B039, B038 |
| 47 | feed | — | B039 | SECONDARY_BLANK | 219×1132 / 90° | — |  |
| 48 | ROTATE_90 | — | B039 | SECONDARY_BLANK | 1132×219 / 90→180° | 90°; 0→1 | B039 |
| 49 | CUT | 20 | B039 | SECONDARY_BLANK | 1132×219 / 180° | V: (127,0)→(127,219) | B041, B040 |
| 50 | feed | — | B037 | SECONDARY_BLANK | 599×622 / 0° | — |  |
| 51 | ROTATE_90 | — | B037 | SECONDARY_BLANK | 622×599 / 0→90° | 90°; 0→1 | B037 |
| 52 | CUT | 21 | B037 | SECONDARY_BLANK | 622×599 / 90° | V: (18,0)→(18,599) | B043, B042 |
| 53 | feed | — | B042 | SECONDARY_BLANK | 599×599 / 90° | — |  |
| 54 | CUT | 22 | B042 | SECONDARY_BLANK | 599×599 / 90° | V: (297,0)→(297,599) | B045, B044 |
| 55 | feed | — | B044 | SECONDARY_BLANK | 297×599 / 90° | — |  |
| 56 | ROTATE_90 | — | B044 | SECONDARY_BLANK | 599×297 / 90→180° | 90°; 0→1 | B044 |
| 57 | CUT | 23 | B044 | SECONDARY_BLANK | 599×297 / 180° | V: (297,0)→(297,297) | B047, B046 |
| 58 | feed | — | B045 | SECONDARY_BLANK | 297×599 / 90° | — |  |
| 59 | ROTATE_90 | — | B045 | SECONDARY_BLANK | 599×297 / 90→180° | 90°; 0→1 | B045 |
| 60 | CUT | 24 | B045 | SECONDARY_BLANK | 599×297 / 180° | V: (297,0)→(297,297) | B049, B048 |
| 61 | feed | — | B011 | DETACHED_PRIMARY_STRIP | 394×2750 / 90° | — |  |
| 62 | ROTATE_90 | — | B011 | DETACHED_PRIMARY_STRIP | 2750×394 / 90→180° | 90°; 0→1 | B011 |
| 63 | CUT | 25 | B011 | DETACHED_PRIMARY_STRIP | 2750×394 / 180° | V: (2740,0)→(2740,394) | B051, B050 |
| 64 | feed | — | B051 | SECONDARY_BLANK | 2740×394 / 180° | — |  |
| 65 | CUT | 26 | B051 | SECONDARY_BLANK | 2740×394 / 180° | V: (5,0)→(5,394) | B053, B052 |
| 66 | feed | — | B052 | SECONDARY_BLANK | 2730×394 / 180° | — |  |
| 67 | CUT | 27 | B052 | SECONDARY_BLANK | 2730×394 / 180° | V: (1759,0)→(1759,394) | B055, B054 |
| 68 | feed | — | B055 | SECONDARY_BLANK | 1759×394 / 180° | — |  |
| 69 | ROTATE_90 | — | B055 | SECONDARY_BLANK | 394×1759 / 180→270° | 90°; 0→1 | B055 |
| 70 | CUT | 28 | B055 | SECONDARY_BLANK | 394×1759 / 270° | V: (270,0)→(270,1759) | B056, B057 |
| 71 | feed | — | B056 | SECONDARY_BLANK | 270×1759 / 270° | — |  |
| 72 | ROTATE_90 | — | B056 | SECONDARY_BLANK | 1759×270 / 270→0° | 90°; 0→1 | B056 |
| 73 | CUT | 29 | B056 | SECONDARY_BLANK | 1759×270 / 0° | V: (1695,0)→(1695,270) | B058, B059 |
| 74 | feed | — | B058 | SECONDARY_BLANK | 1695×270 / 0° | — |  |
| 75 | CUT | 30 | B058 | SECONDARY_BLANK | 1695×270 / 0° | V: (420,0)→(420,270) | B060, B061 |
| 76 | feed | — | B061 | SECONDARY_BLANK | 1270×270 / 0° | — |  |
| 77 | CUT | 31 | B061 | SECONDARY_BLANK | 1270×270 / 0° | V: (420,0)→(420,270) | B062, B063 |
| 78 | feed | — | B063 | SECONDARY_BLANK | 845×270 / 0° | — |  |
| 79 | CUT | 32 | B063 | SECONDARY_BLANK | 845×270 / 0° | V: (420,0)→(420,270) | B064, B065 |
| 80 | feed | — | B013 | DETACHED_PRIMARY_STRIP | 270×2750 / 90° | — |  |
| 81 | ROTATE_90 | — | B013 | DETACHED_PRIMARY_STRIP | 2750×270 / 90→180° | 90°; 0→1 | B013 |
| 82 | CUT | 33 | B013 | DETACHED_PRIMARY_STRIP | 2750×270 / 180° | V: (2740,0)→(2740,270) | B067, B066 |
| 83 | feed | — | B067 | SECONDARY_BLANK | 2740×270 / 180° | — |  |
| 84 | CUT | 34 | B067 | SECONDARY_BLANK | 2740×270 / 180° | V: (5,0)→(5,270) | B069, B068 |
| 85 | feed | — | B068 | SECONDARY_BLANK | 2730×270 / 180° | — |  |
| 86 | CUT | 35 | B068 | SECONDARY_BLANK | 2730×270 / 180° | V: (2305,0)→(2305,270) | B071, B070 |
| 87 | feed | — | B071 | SECONDARY_BLANK | 2305×270 / 180° | — |  |
| 88 | CUT | 36 | B071 | SECONDARY_BLANK | 2305×270 / 180° | V: (180,0)→(180,270) | B073, B072 |
| 89 | feed | — | B072 | SECONDARY_BLANK | 2120×270 / 180° | — |  |
| 90 | CUT | 37 | B072 | SECONDARY_BLANK | 2120×270 / 180° | V: (1695,0)→(1695,270) | B075, B074 |
| 91 | feed | — | B075 | SECONDARY_BLANK | 1695×270 / 180° | — |  |
| 92 | CUT | 38 | B075 | SECONDARY_BLANK | 1695×270 / 180° | V: (1270,0)→(1270,270) | B077, B076 |
| 93 | feed | — | B077 | SECONDARY_BLANK | 1270×270 / 180° | — |  |
| 94 | CUT | 39 | B077 | SECONDARY_BLANK | 1270×270 / 180° | V: (845,0)→(845,270) | B079, B078 |
| 95 | feed | — | B079 | SECONDARY_BLANK | 845×270 / 180° | — |  |
| 96 | CUT | 40 | B079 | SECONDARY_BLANK | 845×270 / 180° | V: (420,0)→(420,270) | B081, B080 |
| 97 | load | — | B082 | PRIMARY_PANEL | 2750×1830 / 0° | — |  |
| 98 | CUT | 41 | B082 | PRIMARY_PANEL | 2750×1830 / 0° | V: (5,0)→(5,1830) | B083, B084 |
| 99 | feed | — | B084 | PRIMARY_REMAINDER | 2740×1830 / 0° | — |  |
| 100 | CUT | 42 | B084 | PRIMARY_REMAINDER | 2740×1830 / 0° | V: (2730,0)→(2730,1830) | B085, B086 |
| 101 | feed | — | B085 | PRIMARY_REMAINDER | 2730×1830 / 0° | — |  |
| 102 | CUT | 43 | B085 | PRIMARY_REMAINDER | 2730×1830 / 0° | V: (2487,0)→(2487,1830) | B087, B088 |
| 103 | endPrimary | — | лист 2 | — | — / —° | — | B088 |
| 104 | feed | — | B088 | DETACHED_PRIMARY_STRIP | 238×1830 / 0° | — |  |
| 105 | ROTATE_90 | — | B088 | DETACHED_PRIMARY_STRIP | 1830×238 / 0→90° | 90°; 0→1 | B088 |
| 106 | CUT | 44 | B088 | DETACHED_PRIMARY_STRIP | 1830×238 / 90° | V: (1820,0)→(1820,238) | B090, B089 |
| 107 | feed | — | B090 | SECONDARY_BLANK | 1820×238 / 90° | — |  |
| 108 | CUT | 45 | B090 | SECONDARY_BLANK | 1820×238 / 90° | V: (5,0)→(5,238) | B092, B091 |
| 109 | feed | — | B091 | SECONDARY_BLANK | 1810×238 / 90° | — |  |
| 110 | CUT | 46 | B091 | SECONDARY_BLANK | 1810×238 / 90° | V: (1625,0)→(1625,238) | B094, B093 |
| 111 | feed | — | B094 | SECONDARY_BLANK | 1625×238 / 90° | — |  |
| 112 | CUT | 47 | B094 | SECONDARY_BLANK | 1625×238 / 90° | V: (885,0)→(885,238) | B096, B095 |
| 113 | feed | — | B095 | SECONDARY_BLANK | 735×238 / 90° | — |  |
| 114 | CUT | 48 | B095 | SECONDARY_BLANK | 735×238 / 90° | V: (550,0)→(550,238) | B098, B097 |
| 115 | feed | — | B098 | SECONDARY_BLANK | 550×238 / 90° | — |  |
| 116 | CUT | 49 | B098 | SECONDARY_BLANK | 550×238 / 90° | V: (365,0)→(365,238) | B100, B099 |
| 117 | feed | — | B100 | SECONDARY_BLANK | 365×238 / 90° | — |  |
| 118 | CUT | 50 | B100 | SECONDARY_BLANK | 365×238 / 90° | V: (180,0)→(180,238) | B102, B101 |

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
| B026 | B009 | s0/strip2/end-low | 0, 694, 5, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B027 | B009 | s0/strip2/after-low | 10, 694, 2740, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B028 | B027 | s0/strip2/work | 10, 694, 2730, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B029 | B027 | s0/strip2/end-high | 2745, 694, 5, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B030 | B028 | s0/strip2/work/0 | 10, 694, 966, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B031 | B028 | s0/strip2/work/1 | 981, 694, 1759, 723 | SECONDARY_BLANK → SECONDARY_BLANK | 180→270° | 1 |
| B032 | B031 | s0/strip2/work/1/0 | 981, 694, 1759, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 270→0° | 1 |
| B033 | B031 | s0/strip2/work/1/1 | 981, 1321, 1759, 96 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B034 | B032 | s0/strip2/work/1/0/0 | 981, 694, 1736, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B035 | B032 | s0/strip2/work/1/0/1 | 2722, 694, 18, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B036 | B034 | s0/strip2/work/1/0/0/0 | 981, 694, 1132, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 0→90° | 1 |
| B037 | B034 | s0/strip2/work/1/0/0/1 | 2118, 694, 599, 622 | SECONDARY_BLANK → SECONDARY_BLANK | 0→90° | 1 |
| B038 | B036 | s0/strip2/work/1/0/0/0/0 | 981, 694, 1132, 398 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B039 | B036 | s0/strip2/work/1/0/0/0/1 | 981, 1097, 1132, 219 | SECONDARY_BLANK → SECONDARY_BLANK | 90→180° | 1 |
| B040 | B039 | s0/strip2/work/1/0/0/0/1/0 | 981, 1097, 1000, 219 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B041 | B039 | s0/strip2/work/1/0/0/0/1/1 | 1986, 1097, 127, 219 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B042 | B037 | s0/strip2/work/1/0/0/1/0 | 2118, 694, 599, 599 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B043 | B037 | s0/strip2/work/1/0/0/1/1 | 2118, 1298, 599, 18 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B044 | B042 | s0/strip2/work/1/0/0/1/0/0 | 2118, 694, 599, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 90→180° | 1 |
| B045 | B042 | s0/strip2/work/1/0/0/1/0/1 | 2118, 996, 599, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 90→180° | 1 |
| B046 | B044 | s0/strip2/work/1/0/0/1/0/0/0 | 2118, 694, 297, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B047 | B044 | s0/strip2/work/1/0/0/1/0/0/1 | 2420, 694, 297, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B048 | B045 | s0/strip2/work/1/0/0/1/0/1/0 | 2118, 996, 297, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B049 | B045 | s0/strip2/work/1/0/0/1/0/1/1 | 2420, 996, 297, 297 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B050 | B011 | s0/strip3/end-low | 0, 295, 5, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B051 | B011 | s0/strip3/after-low | 10, 295, 2740, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B052 | B051 | s0/strip3/work | 10, 295, 2730, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B053 | B051 | s0/strip3/end-high | 2745, 295, 5, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B054 | B052 | s0/strip3/work/0 | 10, 295, 966, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B055 | B052 | s0/strip3/work/1 | 981, 295, 1759, 394 | SECONDARY_BLANK → SECONDARY_BLANK | 180→270° | 1 |
| B056 | B055 | s0/strip3/work/1/0 | 981, 295, 1759, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 270→0° | 1 |
| B057 | B055 | s0/strip3/work/1/1 | 981, 570, 1759, 119 | SECONDARY_BLANK → SECONDARY_BLANK | 270→270° | 0 |
| B058 | B056 | s0/strip3/work/1/0/0 | 981, 295, 1695, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B059 | B056 | s0/strip3/work/1/0/1 | 2681, 295, 59, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B060 | B058 | s0/strip3/work/1/0/0/0 | 981, 295, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B061 | B058 | s0/strip3/work/1/0/0/1 | 1406, 295, 1270, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B062 | B061 | s0/strip3/work/1/0/0/1/0 | 1406, 295, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B063 | B061 | s0/strip3/work/1/0/0/1/1 | 1831, 295, 845, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B064 | B063 | s0/strip3/work/1/0/0/1/1/0 | 1831, 295, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B065 | B063 | s0/strip3/work/1/0/0/1/1/1 | 2256, 295, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 0→0° | 0 |
| B066 | B013 | s0/strip4/end-low | 0, 20, 5, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B067 | B013 | s0/strip4/after-low | 10, 20, 2740, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B068 | B067 | s0/strip4/work | 10, 20, 2730, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B069 | B067 | s0/strip4/end-high | 2745, 20, 5, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B070 | B068 | s0/strip4/work/0 | 10, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B071 | B068 | s0/strip4/work/1 | 435, 20, 2305, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B072 | B071 | s0/strip4/work/1/0 | 435, 20, 2120, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B073 | B071 | s0/strip4/work/1/1 | 2560, 20, 180, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B074 | B072 | s0/strip4/work/1/0/0 | 435, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B075 | B072 | s0/strip4/work/1/0/1 | 860, 20, 1695, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B076 | B075 | s0/strip4/work/1/0/1/0 | 860, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B077 | B075 | s0/strip4/work/1/0/1/1 | 1285, 20, 1270, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B078 | B077 | s0/strip4/work/1/0/1/1/0 | 1285, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B079 | B077 | s0/strip4/work/1/0/1/1/1 | 1710, 20, 845, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B080 | B079 | s0/strip4/work/1/0/1/1/1/0 | 1710, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B081 | B079 | s0/strip4/work/1/0/1/1/1/1 | 2135, 20, 420, 270 | SECONDARY_BLANK → SECONDARY_BLANK | 180→180° | 0 |
| B082 | — | s1/raw | 0, 0, 2750, 1830 | PRIMARY_PANEL → PRIMARY_PANEL | 0→0° | 0 |
| B083 | B082 | s1/side-low | 0, 0, 5, 1830 | WASTE → WASTE | 0→0° | 0 |
| B084 | B082 | s1/main0 | 10, 0, 2740, 1830 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 0→0° | 0 |
| B085 | B084 | s1/main1 | 10, 0, 2730, 1830 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 0→0° | 0 |
| B086 | B084 | s1/side-high | 2745, 0, 5, 1830 | WASTE → WASTE | 0→0° | 0 |
| B087 | B085 | s1/remainder0 | 10, 0, 2487, 1830 | PRIMARY_REMAINDER → PRIMARY_REMAINDER | 0→0° | 0 |
| B088 | B085 | s1/strip1 | 2502, 0, 238, 1830 | DETACHED_PRIMARY_STRIP → DETACHED_PRIMARY_STRIP | 0→90° | 1 |
| B089 | B088 | s1/strip1/end-low | 2502, 0, 238, 5 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B090 | B088 | s1/strip1/after-low | 2502, 10, 238, 1820 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B091 | B090 | s1/strip1/work | 2502, 10, 238, 1810 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B092 | B090 | s1/strip1/end-high | 2502, 1825, 238, 5 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B093 | B091 | s1/strip1/work/0 | 2502, 10, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B094 | B091 | s1/strip1/work/1 | 2502, 195, 238, 1625 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B095 | B094 | s1/strip1/work/1/0 | 2502, 195, 238, 735 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B096 | B094 | s1/strip1/work/1/1 | 2502, 935, 238, 885 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B097 | B095 | s1/strip1/work/1/0/0 | 2502, 195, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B098 | B095 | s1/strip1/work/1/0/1 | 2502, 380, 238, 550 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B099 | B098 | s1/strip1/work/1/0/1/0 | 2502, 380, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B100 | B098 | s1/strip1/work/1/0/1/1 | 2502, 565, 238, 365 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B101 | B100 | s1/strip1/work/1/0/1/1/0 | 2502, 565, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |
| B102 | B100 | s1/strip1/work/1/0/1/1/1 | 2502, 750, 238, 180 | SECONDARY_BLANK → SECONDARY_BLANK | 90→90° | 0 |

## Метрики

50 рез, 40439 мм, 16 поворотов (включая предварительные повороты листов), 118 операций. Включены реальные обрезки кромок; необработанный основной остаток не торцуется и не разворачивается. Полные размеры деталей, отдельные отходы, профили и replay находятся в JSON.
