# Нумерованные операции

Все координаты CUT — локальные машинные. Повороты исходного листа и удерживаемых остатков: 0. Совместимость со станком: unknown.

|Шаг|Операция|Вход|Выходы|Материальный прямоугольник|Ориентация|Ось|Начало реза|Подача|
|---:|---|---|---|---|---:|---|---|---|
|1|load|s0/raw|||0||||
|2|cut|s0/raw|s0/edge0, s0/main0|{"x":0,"y":0,"w":2750,"h":1830}|0|H|{"x":0,"y":5}||
|3|feed|s0/main0||{"x":0,"y":10,"w":2750,"h":1820}|0|||advance-in-place|
|4|cut|s0/main0|s0/band1, s0/main1|{"x":0,"y":10,"w":2750,"h":1820}|0|H|{"x":0,"y":719}||
|5|feed|s0/main1||{"x":0,"y":734,"w":2750,"h":1096}|0|||advance-in-place|
|6|cut|s0/main1|s0/band2, s0/main2|{"x":0,"y":734,"w":2750,"h":1096}|0|H|{"x":0,"y":398}||
|7|feed|s0/main2||{"x":0,"y":1137,"w":2750,"h":693}|0|||advance-in-place|
|8|cut|s0/main2|s0/band3, s0/main3|{"x":0,"y":1137,"w":2750,"h":693}|0|H|{"x":0,"y":398}||
|9|feed|s0/main3||{"x":0,"y":1540,"w":2750,"h":290}|0|||advance-in-place|
|10|cut|s0/main3|s0/band4, s0/main4|{"x":0,"y":1540,"w":2750,"h":290}|0|H|{"x":0,"y":270}||
|11|endPrimary||s0/band1, s0/band2, s0/band3, s0/band4||||||
|12|feed|s0/band1||{"x":0,"y":10,"w":2750,"h":719}|0|||load-detached|
|13|rotate|s0/band1|s0/band1|{"x":0,"y":10,"w":2750,"h":719}|90||||
|14|cut|s0/band1|s0/band1/edge0, s0/band1/trimmed0|{"x":0,"y":10,"w":2750,"h":719}|90|H|{"x":0,"y":5}||
|15|feed|s0/band1/trimmed0||{"x":10,"y":10,"w":2740,"h":719}|90|||advance-in-place|
|16|cut|s0/band1/trimmed0|s0/band1/work, s0/band1/edge1|{"x":10,"y":10,"w":2740,"h":719}|90|H|{"x":0,"y":2730}||
|17|feed|s0/band1/work||{"x":10,"y":10,"w":2730,"h":719}|90|||advance-in-place|
|18|cut|s0/band1/work|s0/band1/work/0, s0/band1/work/1|{"x":10,"y":10,"w":2730,"h":719}|90|H|{"x":0,"y":966}||
|19|feed|s0/band1/work/1||{"x":981,"y":10,"w":1759,"h":719}|90|||advance-in-place|
|20|cut|s0/band1/work/1|s0/band1/work/1/0, s0/band1/work/1/1|{"x":981,"y":10,"w":1759,"h":719}|90|H|{"x":0,"y":1000}||
|21|feed|s0/band1/work/1/1||{"x":1986,"y":10,"w":754,"h":719}|90|||advance-in-place|
|22|cut|s0/band1/work/1/1|s0/band1/work/1/1/0, s0/band1/work/1/1/1|{"x":1986,"y":10,"w":754,"h":719}|90|H|{"x":0,"y":297}||
|23|feed|s0/band1/work/1/1/1||{"x":2288,"y":10,"w":452,"h":719}|90|||advance-in-place|
|24|cut|s0/band1/work/1/1/1|s0/band1/work/1/1/1/0, s0/band1/work/1/1/1/1|{"x":2288,"y":10,"w":452,"h":719}|90|H|{"x":0,"y":420}||
|25|feed|s0/band1/work/1/0||{"x":981,"y":10,"w":1000,"h":719}|90|||load-detached|
|26|rotate|s0/band1/work/1/0|s0/band1/work/1/0|{"x":981,"y":10,"w":1000,"h":719}|180||||
|27|cut|s0/band1/work/1/0|s0/band1/work/1/0/1, s0/band1/work/1/0/0|{"x":981,"y":10,"w":1000,"h":719}|180|H|{"x":0,"y":495}||
|28|feed|s0/band1/work/1/0/1||{"x":981,"y":234,"w":1000,"h":495}|180|||advance-in-place|
|29|cut|s0/band1/work/1/0/1|s0/band1/work/1/0/1/1, s0/band1/work/1/0/1/0|{"x":981,"y":234,"w":1000,"h":495}|180|H|{"x":0,"y":193}||
|30|feed|s0/band1/work/1/0/1/1||{"x":981,"y":536,"w":1000,"h":193}|180|||advance-in-place|
|31|cut|s0/band1/work/1/0/1/1|s0/band1/work/1/0/1/1/1, s0/band1/work/1/0/1/1/0|{"x":981,"y":536,"w":1000,"h":193}|180|H|{"x":0,"y":8}||
|32|feed|s0/band1/work/1/0/1/0||{"x":981,"y":234,"w":1000,"h":297}|180|||load-detached|
|33|rotate|s0/band1/work/1/0/1/0|s0/band1/work/1/0/1/0|{"x":981,"y":234,"w":1000,"h":297}|270||||
|34|cut|s0/band1/work/1/0/1/0|s0/band1/work/1/0/1/0/1, s0/band1/work/1/0/1/0/0|{"x":981,"y":234,"w":1000,"h":297}|270|H|{"x":0,"y":698}||
|35|feed|s0/band1/work/1/0/1/0/1||{"x":1283,"y":234,"w":698,"h":297}|270|||advance-in-place|
|36|cut|s0/band1/work/1/0/1/0/1|s0/band1/work/1/0/1/0/1/1, s0/band1/work/1/0/1/0/1/0|{"x":1283,"y":234,"w":698,"h":297}|270|H|{"x":0,"y":396}||
|37|feed|s0/band1/work/1/0/1/0/1/1||{"x":1585,"y":234,"w":396,"h":297}|270|||advance-in-place|
|38|cut|s0/band1/work/1/0/1/0/1/1|s0/band1/work/1/0/1/0/1/1/1, s0/band1/work/1/0/1/0/1/1/0|{"x":1585,"y":234,"w":396,"h":297}|270|H|{"x":0,"y":94}||
|39|feed|s0/band1/work/1/0/1/1/0||{"x":981,"y":536,"w":1000,"h":180}|180|||load-detached|
|40|rotate|s0/band1/work/1/0/1/1/0|s0/band1/work/1/0/1/1/0|{"x":981,"y":536,"w":1000,"h":180}|270||||
|41|cut|s0/band1/work/1/0/1/1/0|s0/band1/work/1/0/1/1/0/1, s0/band1/work/1/0/1/1/0/0|{"x":981,"y":536,"w":1000,"h":180}|270|H|{"x":0,"y":757}||
|42|feed|s0/band1/work/1/0/1/1/0/1||{"x":1224,"y":536,"w":757,"h":180}|270|||advance-in-place|
|43|cut|s0/band1/work/1/0/1/1/0/1|s0/band1/work/1/0/1/1/0/1/1, s0/band1/work/1/0/1/1/0/1/0|{"x":1224,"y":536,"w":757,"h":180}|270|H|{"x":0,"y":514}||
|44|feed|s0/band1/work/1/0/1/1/0/1/1||{"x":1467,"y":536,"w":514,"h":180}|270|||advance-in-place|
|45|cut|s0/band1/work/1/0/1/1/0/1/1|s0/band1/work/1/0/1/1/0/1/1/1, s0/band1/work/1/0/1/1/0/1/1/0|{"x":1467,"y":536,"w":514,"h":180}|270|H|{"x":0,"y":271}||
|46|feed|s0/band1/work/1/0/1/1/0/1/1/1||{"x":1710,"y":536,"w":271,"h":180}|270|||advance-in-place|
|47|cut|s0/band1/work/1/0/1/1/0/1/1/1|s0/band1/work/1/0/1/1/0/1/1/1/1, s0/band1/work/1/0/1/1/0/1/1/1/0|{"x":1710,"y":536,"w":271,"h":180}|270|H|{"x":0,"y":28}||
|48|feed|s0/band1/work/1/1/0||{"x":1986,"y":10,"w":297,"h":719}|90|||load-detached|
|49|rotate|s0/band1/work/1/1/0|s0/band1/work/1/1/0|{"x":1986,"y":10,"w":297,"h":719}|180||||
|50|cut|s0/band1/work/1/1/0|s0/band1/work/1/1/0/1, s0/band1/work/1/1/0/0|{"x":1986,"y":10,"w":297,"h":719}|180|H|{"x":0,"y":417}||
|51|feed|s0/band1/work/1/1/0/1||{"x":1986,"y":312,"w":297,"h":417}|180|||advance-in-place|
|52|cut|s0/band1/work/1/1/0/1|s0/band1/work/1/1/0/1/1, s0/band1/work/1/1/0/1/0|{"x":1986,"y":312,"w":297,"h":417}|180|H|{"x":0,"y":115}||
|53|feed|s0/band1/work/1/1/1/0||{"x":2288,"y":10,"w":420,"h":719}|90|||load-detached|
|54|rotate|s0/band1/work/1/1/1/0|s0/band1/work/1/1/1/0|{"x":2288,"y":10,"w":420,"h":719}|180||||
|55|cut|s0/band1/work/1/1/1/0|s0/band1/work/1/1/1/0/1, s0/band1/work/1/1/1/0/0|{"x":2288,"y":10,"w":420,"h":719}|180|H|{"x":0,"y":444}||
|56|feed|s0/band1/work/1/1/1/0/1||{"x":2288,"y":285,"w":420,"h":444}|180|||advance-in-place|
|57|cut|s0/band1/work/1/1/1/0/1|s0/band1/work/1/1/1/0/1/1, s0/band1/work/1/1/1/0/1/0|{"x":2288,"y":285,"w":420,"h":444}|180|H|{"x":0,"y":169}||
|58|feed|s0/band2||{"x":0,"y":734,"w":2750,"h":398}|0|||load-detached|
|59|rotate|s0/band2|s0/band2|{"x":0,"y":734,"w":2750,"h":398}|90||||
|60|cut|s0/band2|s0/band2/edge0, s0/band2/trimmed0|{"x":0,"y":734,"w":2750,"h":398}|90|H|{"x":0,"y":5}||
|61|feed|s0/band2/trimmed0||{"x":10,"y":734,"w":2740,"h":398}|90|||advance-in-place|
|62|cut|s0/band2/trimmed0|s0/band2/work, s0/band2/edge1|{"x":10,"y":734,"w":2740,"h":398}|90|H|{"x":0,"y":2730}||
|63|feed|s0/band2/work||{"x":10,"y":734,"w":2730,"h":398}|90|||advance-in-place|
|64|cut|s0/band2/work|s0/band2/work/0, s0/band2/work/1|{"x":10,"y":734,"w":2730,"h":398}|90|H|{"x":0,"y":1132}||
|65|feed|s0/band2/work/1||{"x":1147,"y":734,"w":1593,"h":398}|90|||advance-in-place|
|66|cut|s0/band2/work/1|s0/band2/work/1/0, s0/band2/work/1/1|{"x":1147,"y":734,"w":1593,"h":398}|90|H|{"x":0,"y":1132}||
|67|feed|s0/band2/work/1/1||{"x":2284,"y":734,"w":456,"h":398}|90|||advance-in-place|
|68|cut|s0/band2/work/1/1|s0/band2/work/1/1/0, s0/band2/work/1/1/1|{"x":2284,"y":734,"w":456,"h":398}|90|H|{"x":0,"y":420}||
|69|feed|s0/band2/work/1/1/0||{"x":2284,"y":734,"w":420,"h":398}|90|||load-detached|
|70|rotate|s0/band2/work/1/1/0|s0/band2/work/1/1/0|{"x":2284,"y":734,"w":420,"h":398}|180||||
|71|cut|s0/band2/work/1/1/0|s0/band2/work/1/1/0/1, s0/band2/work/1/1/0/0|{"x":2284,"y":734,"w":420,"h":398}|180|H|{"x":0,"y":123}||
|72|feed|s0/band3||{"x":0,"y":1137,"w":2750,"h":398}|0|||load-detached|
|73|rotate|s0/band3|s0/band3|{"x":0,"y":1137,"w":2750,"h":398}|90||||
|74|cut|s0/band3|s0/band3/edge0, s0/band3/trimmed0|{"x":0,"y":1137,"w":2750,"h":398}|90|H|{"x":0,"y":5}||
|75|feed|s0/band3/trimmed0||{"x":10,"y":1137,"w":2740,"h":398}|90|||advance-in-place|
|76|cut|s0/band3/trimmed0|s0/band3/work, s0/band3/edge1|{"x":10,"y":1137,"w":2740,"h":398}|90|H|{"x":0,"y":2730}||
|77|feed|s0/band3/work||{"x":10,"y":1137,"w":2730,"h":398}|90|||advance-in-place|
|78|cut|s0/band3/work|s0/band3/work/0, s0/band3/work/1|{"x":10,"y":1137,"w":2730,"h":398}|90|H|{"x":0,"y":966}||
|79|feed|s0/band3/work/1||{"x":981,"y":1137,"w":1759,"h":398}|90|||advance-in-place|
|80|cut|s0/band3/work/1|s0/band3/work/1/0, s0/band3/work/1/1|{"x":981,"y":1137,"w":1759,"h":398}|90|H|{"x":0,"y":966}||
|81|feed|s0/band3/work/1/1||{"x":1952,"y":1137,"w":788,"h":398}|90|||advance-in-place|
|82|cut|s0/band3/work/1/1|s0/band3/work/1/1/0, s0/band3/work/1/1/1|{"x":1952,"y":1137,"w":788,"h":398}|90|H|{"x":0,"y":420}||
|83|feed|s0/band3/work/1/1/1||{"x":2377,"y":1137,"w":363,"h":398}|90|||advance-in-place|
|84|cut|s0/band3/work/1/1/1|s0/band3/work/1/1/1/0, s0/band3/work/1/1/1/1|{"x":2377,"y":1137,"w":363,"h":398}|90|H|{"x":0,"y":238}||
|85|feed|s0/band3/work/1/1/0||{"x":1952,"y":1137,"w":420,"h":398}|90|||load-detached|
|86|rotate|s0/band3/work/1/1/0|s0/band3/work/1/1/0|{"x":1952,"y":1137,"w":420,"h":398}|180||||
|87|cut|s0/band3/work/1/1/0|s0/band3/work/1/1/0/1, s0/band3/work/1/1/0/0|{"x":1952,"y":1137,"w":420,"h":398}|180|H|{"x":0,"y":123}||
|88|feed|s0/band3/work/1/1/1/0||{"x":2377,"y":1137,"w":238,"h":398}|90|||load-detached|
|89|rotate|s0/band3/work/1/1/1/0|s0/band3/work/1/1/1/0|{"x":2377,"y":1137,"w":238,"h":398}|180||||
|90|cut|s0/band3/work/1/1/1/0|s0/band3/work/1/1/1/0/1, s0/band3/work/1/1/1/0/0|{"x":2377,"y":1137,"w":238,"h":398}|180|H|{"x":0,"y":213}||
|91|feed|s0/band4||{"x":0,"y":1540,"w":2750,"h":270}|0|||load-detached|
|92|rotate|s0/band4|s0/band4|{"x":0,"y":1540,"w":2750,"h":270}|90||||
|93|cut|s0/band4|s0/band4/edge0, s0/band4/trimmed0|{"x":0,"y":1540,"w":2750,"h":270}|90|H|{"x":0,"y":5}||
|94|feed|s0/band4/trimmed0||{"x":10,"y":1540,"w":2740,"h":270}|90|||advance-in-place|
|95|cut|s0/band4/trimmed0|s0/band4/work, s0/band4/edge1|{"x":10,"y":1540,"w":2740,"h":270}|90|H|{"x":0,"y":2730}||
|96|feed|s0/band4/work||{"x":10,"y":1540,"w":2730,"h":270}|90|||advance-in-place|
|97|cut|s0/band4/work|s0/band4/work/0, s0/band4/work/1|{"x":10,"y":1540,"w":2730,"h":270}|90|H|{"x":0,"y":420}||
|98|feed|s0/band4/work/1||{"x":435,"y":1540,"w":2305,"h":270}|90|||advance-in-place|
|99|cut|s0/band4/work/1|s0/band4/work/1/0, s0/band4/work/1/1|{"x":435,"y":1540,"w":2305,"h":270}|90|H|{"x":0,"y":420}||
|100|feed|s0/band4/work/1/1||{"x":860,"y":1540,"w":1880,"h":270}|90|||advance-in-place|
|101|cut|s0/band4/work/1/1|s0/band4/work/1/1/0, s0/band4/work/1/1/1|{"x":860,"y":1540,"w":1880,"h":270}|90|H|{"x":0,"y":420}||
|102|feed|s0/band4/work/1/1/1||{"x":1285,"y":1540,"w":1455,"h":270}|90|||advance-in-place|
|103|cut|s0/band4/work/1/1/1|s0/band4/work/1/1/1/0, s0/band4/work/1/1/1/1|{"x":1285,"y":1540,"w":1455,"h":270}|90|H|{"x":0,"y":420}||
|104|feed|s0/band4/work/1/1/1/1||{"x":1710,"y":1540,"w":1030,"h":270}|90|||advance-in-place|
|105|cut|s0/band4/work/1/1/1/1|s0/band4/work/1/1/1/1/0, s0/band4/work/1/1/1/1/1|{"x":1710,"y":1540,"w":1030,"h":270}|90|H|{"x":0,"y":420}||
|106|feed|s0/band4/work/1/1/1/1/1||{"x":2135,"y":1540,"w":605,"h":270}|90|||advance-in-place|
|107|cut|s0/band4/work/1/1/1/1/1|s0/band4/work/1/1/1/1/1/0, s0/band4/work/1/1/1/1/1/1|{"x":2135,"y":1540,"w":605,"h":270}|90|H|{"x":0,"y":420}||
