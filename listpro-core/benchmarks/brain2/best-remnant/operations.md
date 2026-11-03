# Brain 2.0 — physical operations

Machine feasibility: unknown. CUT endpoints use local coordinates of the current physical blank. Material rectangles retain original grain coordinates. All dimensions are mm.

|Step|Type|Input|Output|Material x,y,w,h|Orientation|Machine axis and segment|
|---:|---|---|---|---|---|---|
|1|load|s0/raw|||0||
|2|cut|s0/raw|s0/side0, s0/side-rem|0, 0, 2750, 1830|0|V {&quot;x&quot;:5,&quot;y&quot;:0} → {&quot;x&quot;:5,&quot;y&quot;:1830}|
|3|feed|s0/side-rem||10, 0, 2740, 1830|0||
|4|cut|s0/side-rem|s0/body, s0/side1|10, 0, 2740, 1830|0|V {&quot;x&quot;:2730,&quot;y&quot;:0} → {&quot;x&quot;:2730,&quot;y&quot;:1830}|
|5|feed|s0/body||10, 0, 2730, 1830|0||
|6|cut|s0/body|s0/strip1, s0/rip-rem0|10, 0, 2730, 1830|0|V {&quot;x&quot;:2720,&quot;y&quot;:0} → {&quot;x&quot;:2720,&quot;y&quot;:1830}|
|7|endPrimary||s0/strip1||||
|8|feed|s0/strip1||10, 0, 2720, 1830|0||
|9|rotate|s0/strip1|s0/strip1|10, 0, 2720, 1830|90||
|10|cut|s0/strip1|s0/strip1/after-top, s0/strip1/top|10, 0, 2720, 1830|90|V {&quot;x&quot;:1820,&quot;y&quot;:0} → {&quot;x&quot;:1820,&quot;y&quot;:2720}|
|11|feed|s0/strip1/after-top||10, 10, 2720, 1820|90||
|12|cut|s0/strip1/after-top|s0/strip1/bottom, s0/strip1/work|10, 10, 2720, 1820|90|V {&quot;x&quot;:5,&quot;y&quot;:0} → {&quot;x&quot;:5,&quot;y&quot;:2720}|
|13|feed|s0/strip1/work||10, 10, 2720, 1810|90||
|14|rotate|s0/strip1/work|s0/strip1/work|10, 10, 2720, 1810|180||
|15|cut|s0/strip1/work|s0/strip1/work/1, s0/strip1/work/0|10, 10, 2720, 1810|180|V {&quot;x&quot;:1749,&quot;y&quot;:0} → {&quot;x&quot;:1749,&quot;y&quot;:1810}|
|16|feed|s0/strip1/work/0||10, 10, 966, 1810|180||
|17|rotate|s0/strip1/work/0|s0/strip1/work/0|10, 10, 966, 1810|270||
|18|cut|s0/strip1/work/0|s0/strip1/work/0/0, s0/strip1/work/0/1|10, 10, 966, 1810|270|V {&quot;x&quot;:398,&quot;y&quot;:0} → {&quot;x&quot;:398,&quot;y&quot;:966}|
|19|feed|s0/strip1/work/0/1||10, 413, 966, 1407|270||
|20|cut|s0/strip1/work/0/1|s0/strip1/work/0/1/0, s0/strip1/work/0/1/1|10, 413, 966, 1407|270|V {&quot;x&quot;:398,&quot;y&quot;:0} → {&quot;x&quot;:398,&quot;y&quot;:966}|
|21|feed|s0/strip1/work/0/1/1||10, 816, 966, 1004|270||
|22|cut|s0/strip1/work/0/1/1|s0/strip1/work/0/1/1/0, s0/strip1/work/0/1/1/1|10, 816, 966, 1004|270|V {&quot;x&quot;:719,&quot;y&quot;:0} → {&quot;x&quot;:719,&quot;y&quot;:966}|
|23|feed|s0/strip1/work/0/1/1/1||10, 1540, 966, 280|270||
|24|cut|s0/strip1/work/0/1/1/1|s0/strip1/work/0/1/1/1/0, s0/strip1/work/0/1/1/1/1|10, 1540, 966, 280|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:966}|
|25|feed|s0/strip1/work/0/1/1/1/0||10, 1540, 966, 270|270||
|26|rotate|s0/strip1/work/0/1/1/1/0|s0/strip1/work/0/1/1/1/0|10, 1540, 966, 270|0||
|27|cut|s0/strip1/work/0/1/1/1/0|s0/strip1/work/0/1/1/1/0/0, s0/strip1/work/0/1/1/1/0/1|10, 1540, 966, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|28|feed|s0/strip1/work/0/1/1/1/0/1||435, 1540, 541, 270|0||
|29|cut|s0/strip1/work/0/1/1/1/0/1|s0/strip1/work/0/1/1/1/0/1/0, s0/strip1/work/0/1/1/1/0/1/1|435, 1540, 541, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|30|feed|s0/strip1/work/1||981, 10, 1749, 1810|180||
|31|rotate|s0/strip1/work/1|s0/strip1/work/1|981, 10, 1749, 1810|270||
|32|cut|s0/strip1/work/1|s0/strip1/work/1/0, s0/strip1/work/1/1|981, 10, 1749, 1810|270|V {&quot;x&quot;:219,&quot;y&quot;:0} → {&quot;x&quot;:219,&quot;y&quot;:1749}|
|33|feed|s0/strip1/work/1/0||981, 10, 1749, 219|270||
|34|rotate|s0/strip1/work/1/0|s0/strip1/work/1/0|981, 10, 1749, 219|0||
|35|cut|s0/strip1/work/1/0|s0/strip1/work/1/0/0, s0/strip1/work/1/0/1|981, 10, 1749, 219|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:219}|
|36|feed|s0/strip1/work/1/0/0||981, 10, 238, 219|0||
|37|rotate|s0/strip1/work/1/0/0|s0/strip1/work/1/0/0|981, 10, 238, 219|90||
|38|cut|s0/strip1/work/1/0/0|s0/strip1/work/1/0/0/1, s0/strip1/work/1/0/0/0|981, 10, 238, 219|90|V {&quot;x&quot;:34,&quot;y&quot;:0} → {&quot;x&quot;:34,&quot;y&quot;:238}|
|39|feed|s0/strip1/work/1/0/1||1224, 10, 1506, 219|0||
|40|cut|s0/strip1/work/1/0/1|s0/strip1/work/1/0/1/0, s0/strip1/work/1/0/1/1|1224, 10, 1506, 219|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:219}|
|41|feed|s0/strip1/work/1/0/1/0||1224, 10, 238, 219|0||
|42|rotate|s0/strip1/work/1/0/1/0|s0/strip1/work/1/0/1/0|1224, 10, 238, 219|90||
|43|cut|s0/strip1/work/1/0/1/0|s0/strip1/work/1/0/1/0/1, s0/strip1/work/1/0/1/0/0|1224, 10, 238, 219|90|V {&quot;x&quot;:34,&quot;y&quot;:0} → {&quot;x&quot;:34,&quot;y&quot;:238}|
|44|feed|s0/strip1/work/1/0/1/1||1467, 10, 1263, 219|0||
|45|cut|s0/strip1/work/1/0/1/1|s0/strip1/work/1/0/1/1/0, s0/strip1/work/1/0/1/1/1|1467, 10, 1263, 219|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:219}|
|46|feed|s0/strip1/work/1/0/1/1/0||1467, 10, 238, 219|0||
|47|rotate|s0/strip1/work/1/0/1/1/0|s0/strip1/work/1/0/1/1/0|1467, 10, 238, 219|90||
|48|cut|s0/strip1/work/1/0/1/1/0|s0/strip1/work/1/0/1/1/0/1, s0/strip1/work/1/0/1/1/0/0|1467, 10, 238, 219|90|V {&quot;x&quot;:34,&quot;y&quot;:0} → {&quot;x&quot;:34,&quot;y&quot;:238}|
|49|feed|s0/strip1/work/1/0/1/1/1||1710, 10, 1020, 219|0||
|50|cut|s0/strip1/work/1/0/1/1/1|s0/strip1/work/1/0/1/1/1/0, s0/strip1/work/1/0/1/1/1/1|1710, 10, 1020, 219|0|V {&quot;x&quot;:1000,&quot;y&quot;:0} → {&quot;x&quot;:1000,&quot;y&quot;:219}|
|51|feed|s0/strip1/work/1/1||981, 234, 1749, 1586|270||
|52|cut|s0/strip1/work/1/1|s0/strip1/work/1/1/0, s0/strip1/work/1/1/1|981, 234, 1749, 1586|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:1749}|
|53|feed|s0/strip1/work/1/1/0||981, 234, 1749, 270|270||
|54|rotate|s0/strip1/work/1/1/0|s0/strip1/work/1/1/0|981, 234, 1749, 270|0||
|55|cut|s0/strip1/work/1/1/0|s0/strip1/work/1/1/0/0, s0/strip1/work/1/1/0/1|981, 234, 1749, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|56|feed|s0/strip1/work/1/1/0/1||1406, 234, 1324, 270|0||
|57|cut|s0/strip1/work/1/1/0/1|s0/strip1/work/1/1/0/1/0, s0/strip1/work/1/1/0/1/1|1406, 234, 1324, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|58|feed|s0/strip1/work/1/1/0/1/1||1831, 234, 899, 270|0||
|59|cut|s0/strip1/work/1/1/0/1/1|s0/strip1/work/1/1/0/1/1/0, s0/strip1/work/1/1/0/1/1/1|1831, 234, 899, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|60|feed|s0/strip1/work/1/1/0/1/1/1||2256, 234, 474, 270|0||
|61|cut|s0/strip1/work/1/1/0/1/1/1|s0/strip1/work/1/1/0/1/1/1/0, s0/strip1/work/1/1/0/1/1/1/1|2256, 234, 474, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|62|feed|s0/strip1/work/1/1/1||981, 509, 1749, 1311|270||
|63|cut|s0/strip1/work/1/1/1|s0/strip1/work/1/1/1/0, s0/strip1/work/1/1/1/1|981, 509, 1749, 1311|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:1749}|
|64|feed|s0/strip1/work/1/1/1/0||981, 509, 1749, 270|270||
|65|rotate|s0/strip1/work/1/1/1/0|s0/strip1/work/1/1/1/0|981, 509, 1749, 270|0||
|66|cut|s0/strip1/work/1/1/1/0|s0/strip1/work/1/1/1/0/0, s0/strip1/work/1/1/1/0/1|981, 509, 1749, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|67|feed|s0/strip1/work/1/1/1/0/1||1406, 509, 1324, 270|0||
|68|cut|s0/strip1/work/1/1/1/0/1|s0/strip1/work/1/1/1/0/1/0, s0/strip1/work/1/1/1/0/1/1|1406, 509, 1324, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|69|feed|s0/strip1/work/1/1/1/0/1/1||1831, 509, 899, 270|0||
|70|cut|s0/strip1/work/1/1/1/0/1/1|s0/strip1/work/1/1/1/0/1/1/0, s0/strip1/work/1/1/1/0/1/1/1|1831, 509, 899, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|71|feed|s0/strip1/work/1/1/1/0/1/1/1||2256, 509, 474, 270|0||
|72|cut|s0/strip1/work/1/1/1/0/1/1/1|s0/strip1/work/1/1/1/0/1/1/1/0, s0/strip1/work/1/1/1/0/1/1/1/1|2256, 509, 474, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|73|feed|s0/strip1/work/1/1/1/1||981, 784, 1749, 1036|270||
|74|rotate|s0/strip1/work/1/1/1/1|s0/strip1/work/1/1/1/1|981, 784, 1749, 1036|0||
|75|cut|s0/strip1/work/1/1/1/1|s0/strip1/work/1/1/1/1/0, s0/strip1/work/1/1/1/1/1|981, 784, 1749, 1036|0|V {&quot;x&quot;:297,&quot;y&quot;:0} → {&quot;x&quot;:297,&quot;y&quot;:1036}|
|76|feed|s0/strip1/work/1/1/1/1/0||981, 784, 297, 1036|0||
|77|rotate|s0/strip1/work/1/1/1/1/0|s0/strip1/work/1/1/1/1/0|981, 784, 297, 1036|90||
|78|cut|s0/strip1/work/1/1/1/1/0|s0/strip1/work/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/0/0|981, 784, 297, 1036|90|V {&quot;x&quot;:851,&quot;y&quot;:0} → {&quot;x&quot;:851,&quot;y&quot;:297}|
|79|feed|s0/strip1/work/1/1/1/1/0/0||981, 784, 297, 180|90||
|80|rotate|s0/strip1/work/1/1/1/1/0/0|s0/strip1/work/1/1/1/1/0/0|981, 784, 297, 180|180||
|81|cut|s0/strip1/work/1/1/1/1/0/0|s0/strip1/work/1/1/1/1/0/0/1, s0/strip1/work/1/1/1/1/0/0/0|981, 784, 297, 180|180|V {&quot;x&quot;:54,&quot;y&quot;:0} → {&quot;x&quot;:54,&quot;y&quot;:180}|
|82|feed|s0/strip1/work/1/1/1/1/0/1||981, 969, 297, 851|90||
|83|cut|s0/strip1/work/1/1/1/1/0/1|s0/strip1/work/1/1/1/1/0/1/1, s0/strip1/work/1/1/1/1/0/1/0|981, 969, 297, 851|90|V {&quot;x&quot;:666,&quot;y&quot;:0} → {&quot;x&quot;:666,&quot;y&quot;:297}|
|84|feed|s0/strip1/work/1/1/1/1/0/1/0||981, 969, 297, 180|90||
|85|rotate|s0/strip1/work/1/1/1/1/0/1/0|s0/strip1/work/1/1/1/1/0/1/0|981, 969, 297, 180|180||
|86|cut|s0/strip1/work/1/1/1/1/0/1/0|s0/strip1/work/1/1/1/1/0/1/0/1, s0/strip1/work/1/1/1/1/0/1/0/0|981, 969, 297, 180|180|V {&quot;x&quot;:54,&quot;y&quot;:0} → {&quot;x&quot;:54,&quot;y&quot;:180}|
|87|feed|s0/strip1/work/1/1/1/1/0/1/1||981, 1154, 297, 666|90||
|88|cut|s0/strip1/work/1/1/1/1/0/1/1|s0/strip1/work/1/1/1/1/0/1/1/1, s0/strip1/work/1/1/1/1/0/1/1/0|981, 1154, 297, 666|90|V {&quot;x&quot;:364,&quot;y&quot;:0} → {&quot;x&quot;:364,&quot;y&quot;:297}|
|89|feed|s0/strip1/work/1/1/1/1/0/1/1/1||981, 1456, 297, 364|90||
|90|cut|s0/strip1/work/1/1/1/1/0/1/1/1|s0/strip1/work/1/1/1/1/0/1/1/1/1, s0/strip1/work/1/1/1/1/0/1/1/1/0|981, 1456, 297, 364|90|V {&quot;x&quot;:62,&quot;y&quot;:0} → {&quot;x&quot;:62,&quot;y&quot;:297}|
|91|feed|s0/strip1/work/1/1/1/1/1||1283, 784, 1447, 1036|0||
|92|cut|s0/strip1/work/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/0, s0/strip1/work/1/1/1/1/1/1|1283, 784, 1447, 1036|0|V {&quot;x&quot;:297,&quot;y&quot;:0} → {&quot;x&quot;:297,&quot;y&quot;:1036}|
|93|feed|s0/strip1/work/1/1/1/1/1/0||1283, 784, 297, 1036|0||
|94|rotate|s0/strip1/work/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/0|1283, 784, 297, 1036|90||
|95|cut|s0/strip1/work/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/1/0/0|1283, 784, 297, 1036|90|V {&quot;x&quot;:734,&quot;y&quot;:0} → {&quot;x&quot;:734,&quot;y&quot;:297}|
|96|feed|s0/strip1/work/1/1/1/1/1/0/1||1283, 1086, 297, 734|90||
|97|cut|s0/strip1/work/1/1/1/1/1/0/1|s0/strip1/work/1/1/1/1/1/0/1/1, s0/strip1/work/1/1/1/1/1/0/1/0|1283, 1086, 297, 734|90|V {&quot;x&quot;:432,&quot;y&quot;:0} → {&quot;x&quot;:432,&quot;y&quot;:297}|
|98|feed|s0/strip1/work/1/1/1/1/1/0/1/1||1283, 1388, 297, 432|90||
|99|cut|s0/strip1/work/1/1/1/1/1/0/1/1|s0/strip1/work/1/1/1/1/1/0/1/1/1, s0/strip1/work/1/1/1/1/1/0/1/1/0|1283, 1388, 297, 432|90|V {&quot;x&quot;:130,&quot;y&quot;:0} → {&quot;x&quot;:130,&quot;y&quot;:297}|
|100|feed|s0/strip1/work/1/1/1/1/1/1||1585, 784, 1145, 1036|0||
|101|rotate|s0/strip1/work/1/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1|1585, 784, 1145, 1036|90||
|102|cut|s0/strip1/work/1/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/1/0|1585, 784, 1145, 1036|90|V {&quot;x&quot;:633,&quot;y&quot;:0} → {&quot;x&quot;:633,&quot;y&quot;:1145}|
|103|feed|s0/strip1/work/1/1/1/1/1/1/0||1585, 784, 1145, 398|90||
|104|rotate|s0/strip1/work/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/0|1585, 784, 1145, 398|180||
|105|cut|s0/strip1/work/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/1/1/0/0|1585, 784, 1145, 398|180|V {&quot;x&quot;:8,&quot;y&quot;:0} → {&quot;x&quot;:8,&quot;y&quot;:398}|
|106|feed|s0/strip1/work/1/1/1/1/1/1/1||1585, 1187, 1145, 633|90||
|107|cut|s0/strip1/work/1/1/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/1/1/0|1585, 1187, 1145, 633|90|V {&quot;x&quot;:230,&quot;y&quot;:0} → {&quot;x&quot;:230,&quot;y&quot;:1145}|
|108|feed|s0/strip1/work/1/1/1/1/1/1/1/0||1585, 1187, 1145, 398|90||
|109|rotate|s0/strip1/work/1/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/1/0|1585, 1187, 1145, 398|180||
|110|cut|s0/strip1/work/1/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/1/1/1/0/0|1585, 1187, 1145, 398|180|V {&quot;x&quot;:8,&quot;y&quot;:0} → {&quot;x&quot;:8,&quot;y&quot;:398}|
