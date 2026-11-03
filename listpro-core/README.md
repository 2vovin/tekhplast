# ЛистПро PSS 1.4 — recovery отходов

Новый API: `require('./src/pss-recovery').searchPSS14(order,{profile,previous})`. Автоматически дозагружает реальные waste-листья экземплярами с последующих листов, перестраивает вторичные поддеревья и группы полос; каждый полный результат проверяется независимым replay.

Контроль: **25 / 1 деталь на двух листах**; четыре №9 перенесены на первый лист. Промежуточный результат **23 / 3** доказывает перенос двух №9 в исходный участок 320×398. Один лист не найден; невозможность не доказана.

Итог: 52 реза, 43 019 мм пропилов, 19 поворотов, 125 операций. Крупнейший остаток прежний, 2487×1810; другой остаток второго листа увеличился до 238×1625. Дополнительные резы и повороты — явная цена улучшения заполнения.

- [Подробный отчёт](docs/RESULTS.md)
- [Итоговые карты и все операции](docs/CONTROL-26-PSS-1.4.md)
- [Доказательство переноса в участок 320×398](docs/CONTROL-26-PSS-1.4-WASTE.md)
- [Итоговый JSON](benchmarks/manual-26-pss-1.4.json)
- [Исходный код](src/pss-recovery.js) · [локальный DP](src/pss-waste-local.js)
- `npm test` · `npm run benchmark:pss14` · `npm run benchmark:pss14:research`

Профиль абстрактный. Совместимость с конкретным станком не подтверждена. Исторические версии и их карты сохранены.

---

# ЛистПро Brain 1.3 — PSS: DP и обмен группами между полосами

Новый API: `require('./src/pss-improve').searchPSS13(order, {profile, previous, seed:1, lnsIterations:5000})`. Параметр previous необязателен и независимо проверяется перед продолжением. Старый API PSS 1.2 сохранён для сравнения.

Контрольный заказ без изменений: **26 деталей / 2 листа / 50 резов / 40 439 мм / 16 поворотов / 118 операций**. Крупнейший цельный рабочий остаток **2487×1810 мм**. Решение на одном листе не найдено; невозможность не доказана.

- [Отчёт и сравнение с 1.2](docs/RESULTS.md)
- [Карты полос, подполос и все операции](docs/CONTROL-26-PSS-1.3.md)
- [JSON результата](benchmarks/manual-26-pss-1.3.json)
- [Новый оптимизатор](src/pss-improve.js) · [независимый валидатор](src/pss-validator.js)
- `npm test` — все тесты; `npm run benchmark:pss13` — воспроизведение сохранённого улучшения; `npm run benchmark:pss13:research` — дополнительные ограниченные поиски одного листа.

Группы и DP используются только за настоящими якорями. Основной остаток после начала распуска не вращается. Профиль абстрактный; совместимость с конкретным станком не подтверждена.

---

# ЛистПро Мебель — Brain 1.2 / PSS

Текущий целевой режим PANEL_SAW_STAGED использует реальные детали-якоря, роли первичного остатка и независимый replay.
**Историческая однолистовая карта Brain 1.1 не проходит новые PSS-правила: шаг 9 поворачивает PRIMARY_REMAINDER 1754×1830.**
В новом контрольном поиске все 26 деталей размещены на двух листах; допустимый один лист не найден, невозможность одного листа не доказана.

```js
const {searchPSS}=require('./src/pss');
const {validatePSS}=require('./src/pss-validator');
const profile=require('./profiles/pss-anchored-single-axis-v1.json');
const order=require('./benchmarks/manual-26-no-rotation.json');
const result=searchPSS(order,{profile,seed:1,iterations:100000});
console.log(validatePSS(order,result,result.plan,profile));
// Продолжение: searchPSS(order,{profile,seed:2,iterations:100000,previous:result});
```

PRIMARY_REMAINDER не вращается после первого реза. Каждая рабочая полоса имеет настоящую ведущую деталь той же поперечной ширины.
FINAL_REMAINDER_AS_STRIP разрешён только при отдельном доказанном переходе с реальным якорем; endPrimary роли не меняет.
FORMAT_SAW имеет отдельные планировщик/валидатор без PSS-якорей и универсального лимита поворотов.
Общая точка выбора проверок: src/machine-modes.js.
Профили абстрактные и не подтверждают совместимость с реальным станком или БАЗИС.

[Карта всех листов, первичные полосы, все подполосы и операции](docs/CONTROL-26-PSS.md) · [RESULTS.md](docs/RESULTS.md).
Команды: npm test; npm run benchmark:pss; npm run benchmark.
Последняя команда также исполняет исторические NON-PSS регрессии.
src/pss-export.js воспроизводит SVG и Markdown для результата.

---

## История API до PSS 1.2

Следующие сведения относятся к старым моделям. Их valid=true не является доказательством строгого PANEL_SAW_STAGED.

# ЛистПро Core — проект для Codex

Это стартовый репозиторий **вычислительного ядра раскроя**, а не готовая Windows-программа. Основная задача Codex — создать и испытать качественный оптимизатор.

Рабочая папка: `listpro-core`.

```bash
cd listpro-core
npm test
npm run benchmark
```

Требуется Node.js 20+. Зависимости npm не нужны.

Контрольный файл: `benchmarks/manual-26-no-rotation.json` — 26 деталей, лист 2750 × 1830 мм, пропил 5 мм, обрезка 10 мм, без поворотов.

Ориентир: ручная карта размещает 26 деталей на одном листе. Однако её технологическая реализуемость на конкретном станке не доказана. Алгоритм должен предоставить не только координаты, но и проверяемое дерево прямолинейных резов.

`src/core.js` — **намеренно слабый стартовый алгоритм**. Он демонстрирует базовую модель и API; не утверждает оптимальность или пригодность для реального станка. Codex должен улучшить / заменить его и внедрить независимый валидатор.

Проект расположен в отдельной ветке `listpro-core` публичного репозитория `2vovin/tekhplast`. Исходный сайт в ветке `main` оставлен без изменений.


## Проверка оборудования без вращений

Профиль задаётся явно; без него результат имеет только геометрический статус.

```js
const {pack}=require('./src/core');
const {validateTechnology}=require('./src/technology-validator');
const profile=require('./profiles/abstract-fixed-xy-v1.json');
const order=require('./benchmarks/manual-26-no-rotation.json');
const result=pack(order,{seed:1,iterations:100000,profile});
const checked=validateTechnology(order,result,result.machinePlan,profile);
console.log(checked.geometry,checked.technology);
// Продолжение: pack(order,{seed:2,iterations:100000,profile,previous:result})
```

Это условный двухосевой стол с независимой фиксацией заготовок на месте, не модель конкретного станка. Повороты листа и полос, перемещение и перебазирование запрещены. Ось V означает x=const, H означает y=const. Независимый replay начинает с сырого листа и включает обрезку краёв.
Геометрическая корректность не подтверждает совместимость с ЧПУ/БАЗИС.
[Карта и пошаговые операции](docs/CONTROL-26-TECHNOLOGY.md), [результаты и ограничения](docs/RESULTS.md).


## Целевой режим «ЛистПро Мебель»: многостадийный пильный центр

Новый режим отделён от прежнего неподвижного двухосевого стола. Сначала исходный лист без вращения распускается на первичные полосы одной осью. После завершения первичного распуска полосы и подполосы подаются как новые заготовки и могут поворачиваться на 90°. Запрет поворота готовой детали относительно текстуры проверяется в координатах материала.

```js
const {searchStaged}=require('./src/staged');
const {validateStaged}=require('./src/staged-validator');
const profile=require('./profiles/abstract-staged-v-saw-v1.json');
const order=require('./benchmarks/manual-26-no-rotation.json');
const result=searchStaged(order,{seed:1,iterations:100000,profile});
console.log(validateStaged(order,result,result.plan,profile));
// Продолжение: searchStaged(order,{seed:2,iterations:100000,profile,previous:result});
```

Профиль условный: одна машинная ось V, разрешённые повороты только отделённых заготовок. Неизвестные ограничения оборудования заданы null, а не вымышлены. Реальная совместимость с БАЗИС/ЧПУ не подтверждена.
Независимый replay возвращает geometryValid, stagedPlanValid, machineProfileValid, метрики, журнал состояний и историю заготовок.

[Карта первичных полос, все операции и детали](docs/CONTROL-26-STAGED.md).
[Полный воспроизводимый результат](benchmarks/manual-26-staged.json).
`npm test` проверяет старые и новые режимы; `npm run benchmark` запускает обе регрессии. Только новый режим: `node scripts/staged-benchmark.js`.


Уточнение счётчиков: maxTurnsPerBlank=1 относится к каждому blankId отдельно.
CUT завершает жизнь родителя и создаёт двух детей с turnCount=0, сохраняя машинную ориентацию и текстуру.
Повторный поворот того же blankId запрещён. Основной профиль допускает до одного поворота листа; генератор выбирает 0.
Профиль abstract-staged-v-no-sheet-turn-v1 запрещает поворот исходного листа; тот же контрольный план проходит и его проверку.


## Brain 1.1 — оптимизация полос и деревьев операций

```js
const {searchIndustrial}=require('./src/industrial');
const {validateStaged}=require('./src/staged-validator');
const profile=require('./profiles/abstract-staged-v-saw-v1.json');
const order=require('./benchmarks/manual-26-no-rotation.json');
const result=searchIndustrial(order,{profile,seed:1,iterations:100000,dpStates:12000});
console.log(validateStaged(order,result,result.plan,profile));
// Продолжение: searchIndustrial(order,{profile,seed:2,iterations:100000,previous:result});
```

Цель 1.1: листы → крупнейший цельный остаток → резы/операции → повороты → длина → стадии.
Составные блоки и subset-sum DP дополняются перестройкой гильотинных деревьев внутри первичных полос; каждое улучшение проходит независимый replay.
`src/industrial-export.js` экспортирует renderMap, renderBlankTree, renderOperations для проверенного результата.
`npm run benchmark:industrial` пересчитывает контрольный заказ; `npm run benchmark` также сохраняет все прежние регрессии.
[Карта, все подполосы и операции Brain 1.1](docs/CONTROL-26-BRAIN-1.1.md), [результаты и ограничения](docs/RESULTS.md).
