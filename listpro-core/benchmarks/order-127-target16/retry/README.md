# Повторный поиск 16 листов — 2026-11-07

Офлайн-исследование исходного заказа из `../input.json`: **100 строк, 127 деталей, 73 м²**. Все детали могут поворачиваться; 2750×1830, обрезка 10 мм с каждой стороны, пропил 5 мм. Данные заказа не менялись. Рабочий сервис VPS и производственный алгоритм этим экспериментом не обновлялись.

## Что повторено иначе

- LNS: случайные группы из 5, 7, 9, 11 листов с обязательным включением одного/двух наименее заполненных. 69 итераций за 200 секунд, внутренний поиск iterations=25, seed=1000+round. Через каждые 9 раундов разрешён переход к менее плотному промежуточному решению. Каждый объединённый заказ заново компилируется и проверяется. Получено 17 листов; 16 не найдено.
- Банк вариантов: 40 запусков, iterations=8, seed=30000…30039; чередуются исходные строки и группировка одинаковых размеров с разрешёнными поворотами. Собрано 2525 различных наборов деталей на одном листе за 120,5 с. Для каждого набора сохранено проверяемое дерево полос.
- Целочисленный выбор полного комплекта из банка: равенство количества по каждой группе и не более 16 листов. HiGHS отклонил начальный набор из 2200 вариантов как несовместимый с этим ограничением. Это заключение относится **только к этому конечному набору**, а не к возможности раскроить заказ на 16 листах вообще.
- Генерация дополнительных вариантов по оценкам линейной модели: 26 раундов, PackingSolver 0.1.1301, Knapsack, H/V, 2 стадии, по 3 с. Затем 12 раундов с 3 стадиями, по 2 с. Предложение native-движка принимается только после построения нового физического плана и независимого PSS replay. Часть трёхстадийных предложений отклонена. В конечном банке **2732 проверенных варианта листа**.
- OR-Tools CP-SAT 9.15.6755 проверяет точное покрытие, покрытие с избытком и максимальное частичное покрытие на 16 листах. Избыточные экземпляры нельзя выдавать за исходный заказ: `assemble.cjs` убирает их, восстанавливает исходные ID/количества, строит новый план и проверяет его целиком. Частичное покрытие не проходит эту сборку.

Полный результат и окончательные цифры повторной попытки — в [RESULTS.md](RESULTS.md). Исходная проверенная карта на 17 листов сохранена без изменений в родительской папке.

## Воспроизведение

Node.js 24.19.0; Python 3.12, Linux x86_64; исследование выполнялось здесь, не на VPS пользователя. Время зависит от процессора и параллельной нагрузки. Native/CP-SAT с лимитом времени могут выбирать разные промежуточные решения. Архив банка фиксирует фактический исследованный набор независимо от повторной генерации.

Из `listpro-core/`:

```sh
node benchmarks/order-127-target16/verify.cjs
node benchmarks/order-127-target16/retry/verify-pool.cjs
node --test tests/pattern-pool-research.test.js
python3 -m venv /tmp/listpro-retry-env
/tmp/listpro-retry-env/bin/pip install -r benchmarks/order-127-target16/retry/requirements.txt
mkdir -p /tmp/listpro-retry
gzip -dc benchmarks/order-127-target16/retry/pool.json.gz > /tmp/listpro-retry/pool.json
/tmp/listpro-retry-env/bin/python benchmarks/order-127-target16/retry/select-patterns.py /tmp/listpro-retry/pool.json exact
/tmp/listpro-retry-env/bin/python benchmarks/order-127-target16/retry/select-patterns.py /tmp/listpro-retry/pool.json maxcover 180 4 benchmarks/order-127-target16/retry/hint.json
```

Для найденного **полного** комплекта (либо покрытия с избытком):

```sh
node benchmarks/order-127-target16/retry/assemble.cjs /tmp/listpro-retry/pool.json /tmp/listpro-retry/cp-exact-selection.json /tmp/listpro-retry/result.json
```

Для нового поиска, отдельно от зафиксированного архива:

```sh
node benchmarks/order-127-target16/retry/lns.cjs /tmp/listpro-new
node benchmarks/order-127-target16/retry/collect-pool.cjs /tmp/listpro-new /tmp/listpro-new/retry-target16-incumbent.json
/tmp/listpro-retry-env/bin/python benchmarks/order-127-target16/retry/price-patterns.py /tmp/listpro-new/retry-pattern-pool.json /tmp/listpro-price2 2 26
/tmp/listpro-retry-env/bin/python benchmarks/order-127-target16/retry/price-patterns.py /tmp/listpro-price2/column-pool.json /tmp/listpro-price3 3 12
```

Фактический исходный банк включал также дополнительный JS-вариант предыдущей попытки. Поэтому повторная генерация не обещает побайтового совпадения с архивом; проверка сохранённого банка воспроизводит именно фактически использованные варианты.

Скрипты предназначены для этого заказа со свободным поворотом деталей и целочисленными миллиметрами. Это исследовательский портфель, не обновление интерфейса и не программа ЧПУ. Размеры подачи, зажимов, минимальных полос и паспортные ограничения станка остаются неизвестными.

Последний этап: `fill-free.cjs pool.json cp-hinted-selection.json result.json` заполняет свободные прямоугольники, каждый раз перестраивает дерево и replay; затем `last-part-search.cjs result.json found.json /tmp/listpro-retry-env/bin/python` проверяет группы листов с отдельной последней деталью. Если 16 листов не найдено, файл `found.json` не создаётся.
