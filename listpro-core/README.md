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
