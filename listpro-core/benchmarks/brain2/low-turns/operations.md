# Brain 2.0 — physical operations

Machine feasibility: unknown. CUT endpoints use local coordinates of the current physical blank. Material rectangles retain original grain coordinates. All dimensions are mm.

|Step|Type|Input|Output|Material x,y,w,h|Orientation|Machine axis and segment|
|---:|---|---|---|---|---|---|
|1|load|s0/raw|||0||
|2|cut|s0/raw|s0/side0, s0/side-rem|0, 0, 2750, 1830|0|V {&quot;x&quot;:5,&quot;y&quot;:0} → {&quot;x&quot;:5,&quot;y&quot;:1830}|
|3|feed|s0/side-rem||10, 0, 2740, 1830|0||
|4|cut|s0/side-rem|s0/body, s0/side1|10, 0, 2740, 1830|0|V {&quot;x&quot;:2730,&quot;y&quot;:0} → {&quot;x&quot;:2730,&quot;y&quot;:1830}|
|5|feed|s0/body||10, 0, 2730, 1830|0||
|6|cut|s0/body|s0/strip1, s0/rip-rem0|10, 0, 2730, 1830|0|V {&quot;x&quot;:297,&quot;y&quot;:0} → {&quot;x&quot;:297,&quot;y&quot;:1830}|
|7|feed|s0/rip-rem0||312, 0, 2428, 1830|0||
|8|cut|s0/rip-rem0|s0/strip2, s0/rip-rem1|312, 0, 2428, 1830|0|V {&quot;x&quot;:2418,&quot;y&quot;:0} → {&quot;x&quot;:2418,&quot;y&quot;:1830}|
|9|endPrimary||s0/strip1, s0/strip2||||
|10|feed|s0/strip1||10, 0, 297, 1830|0||
|11|rotate|s0/strip1|s0/strip1|10, 0, 297, 1830|90||
|12|cut|s0/strip1|s0/strip1/after-top, s0/strip1/top|10, 0, 297, 1830|90|V {&quot;x&quot;:1820,&quot;y&quot;:0} → {&quot;x&quot;:1820,&quot;y&quot;:297}|
|13|feed|s0/strip1/after-top||10, 10, 297, 1820|90||
|14|cut|s0/strip1/after-top|s0/strip1/bottom, s0/strip1/work|10, 10, 297, 1820|90|V {&quot;x&quot;:5,&quot;y&quot;:0} → {&quot;x&quot;:5,&quot;y&quot;:297}|
|15|feed|s0/strip1/work||10, 10, 297, 1810|90||
|16|cut|s0/strip1/work|s0/strip1/work/1, s0/strip1/work/0|10, 10, 297, 1810|90|V {&quot;x&quot;:1625,&quot;y&quot;:0} → {&quot;x&quot;:1625,&quot;y&quot;:297}|
|17|feed|s0/strip1/work/0||10, 10, 297, 180|90||
|18|rotate|s0/strip1/work/0|s0/strip1/work/0|10, 10, 297, 180|180||
|19|cut|s0/strip1/work/0|s0/strip1/work/0/1, s0/strip1/work/0/0|10, 10, 297, 180|180|V {&quot;x&quot;:54,&quot;y&quot;:0} → {&quot;x&quot;:54,&quot;y&quot;:180}|
|20|feed|s0/strip1/work/1||10, 195, 297, 1625|90||
|21|cut|s0/strip1/work/1|s0/strip1/work/1/1, s0/strip1/work/1/0|10, 195, 297, 1625|90|V {&quot;x&quot;:1323,&quot;y&quot;:0} → {&quot;x&quot;:1323,&quot;y&quot;:297}|
|22|feed|s0/strip1/work/1/1||10, 497, 297, 1323|90||
|23|cut|s0/strip1/work/1/1|s0/strip1/work/1/1/1, s0/strip1/work/1/1/0|10, 497, 297, 1323|90|V {&quot;x&quot;:1021,&quot;y&quot;:0} → {&quot;x&quot;:1021,&quot;y&quot;:297}|
|24|feed|s0/strip1/work/1/1/1||10, 799, 297, 1021|90||
|25|cut|s0/strip1/work/1/1/1|s0/strip1/work/1/1/1/1, s0/strip1/work/1/1/1/0|10, 799, 297, 1021|90|V {&quot;x&quot;:719,&quot;y&quot;:0} → {&quot;x&quot;:719,&quot;y&quot;:297}|
|26|feed|s0/strip1/work/1/1/1/1||10, 1101, 297, 719|90||
|27|cut|s0/strip1/work/1/1/1/1|s0/strip1/work/1/1/1/1/1, s0/strip1/work/1/1/1/1/0|10, 1101, 297, 719|90|V {&quot;x&quot;:417,&quot;y&quot;:0} → {&quot;x&quot;:417,&quot;y&quot;:297}|
|28|feed|s0/strip1/work/1/1/1/1/1||10, 1403, 297, 417|90||
|29|cut|s0/strip1/work/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/0|10, 1403, 297, 417|90|V {&quot;x&quot;:115,&quot;y&quot;:0} → {&quot;x&quot;:115,&quot;y&quot;:297}|
|30|feed|s0/strip2||312, 0, 2418, 1830|0||
|31|rotate|s0/strip2|s0/strip2|312, 0, 2418, 1830|90||
|32|cut|s0/strip2|s0/strip2/after-top, s0/strip2/top|312, 0, 2418, 1830|90|V {&quot;x&quot;:1820,&quot;y&quot;:0} → {&quot;x&quot;:1820,&quot;y&quot;:2418}|
|33|feed|s0/strip2/after-top||312, 10, 2418, 1820|90||
|34|cut|s0/strip2/after-top|s0/strip2/bottom, s0/strip2/work|312, 10, 2418, 1820|90|V {&quot;x&quot;:5,&quot;y&quot;:0} → {&quot;x&quot;:5,&quot;y&quot;:2418}|
|35|feed|s0/strip2/work||312, 10, 2418, 1810|90||
|36|cut|s0/strip2/work|s0/strip2/work/1, s0/strip2/work/0|312, 10, 2418, 1810|90|V {&quot;x&quot;:1407,&quot;y&quot;:0} → {&quot;x&quot;:1407,&quot;y&quot;:2418}|
|37|feed|s0/strip2/work/0||312, 10, 2418, 398|90||
|38|rotate|s0/strip2/work/0|s0/strip2/work/0|312, 10, 2418, 398|180||
|39|cut|s0/strip2/work/0|s0/strip2/work/0/1, s0/strip2/work/0/0|312, 10, 2418, 398|180|V {&quot;x&quot;:1281,&quot;y&quot;:0} → {&quot;x&quot;:1281,&quot;y&quot;:398}|
|40|feed|s0/strip2/work/0/1||1449, 10, 1281, 398|180||
|41|cut|s0/strip2/work/0/1|s0/strip2/work/0/1/1, s0/strip2/work/0/1/0|1449, 10, 1281, 398|180|V {&quot;x&quot;:144,&quot;y&quot;:0} → {&quot;x&quot;:144,&quot;y&quot;:398}|
|42|feed|s0/strip2/work/1||312, 413, 2418, 1407|90||
|43|rotate|s0/strip2/work/1|s0/strip2/work/1|312, 413, 2418, 1407|180||
|44|cut|s0/strip2/work/1|s0/strip2/work/1/1, s0/strip2/work/1/0|312, 413, 2418, 1407|180|V {&quot;x&quot;:1447,&quot;y&quot;:0} → {&quot;x&quot;:1447,&quot;y&quot;:1407}|
|45|feed|s0/strip2/work/1/0||312, 413, 966, 1407|180||
|46|rotate|s0/strip2/work/1/0|s0/strip2/work/1/0|312, 413, 966, 1407|270||
|47|cut|s0/strip2/work/1/0|s0/strip2/work/1/0/0, s0/strip2/work/1/0/1|312, 413, 966, 1407|270|V {&quot;x&quot;:398,&quot;y&quot;:0} → {&quot;x&quot;:398,&quot;y&quot;:966}|
|48|feed|s0/strip2/work/1/0/1||312, 816, 966, 1004|270||
|49|cut|s0/strip2/work/1/0/1|s0/strip2/work/1/0/1/0, s0/strip2/work/1/0/1/1|312, 816, 966, 1004|270|V {&quot;x&quot;:719,&quot;y&quot;:0} → {&quot;x&quot;:719,&quot;y&quot;:966}|
|50|feed|s0/strip2/work/1/0/1/1||312, 1540, 966, 280|270||
|51|cut|s0/strip2/work/1/0/1/1|s0/strip2/work/1/0/1/1/0, s0/strip2/work/1/0/1/1/1|312, 1540, 966, 280|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:966}|
|52|feed|s0/strip2/work/1/0/1/1/0||312, 1540, 966, 270|270||
|53|rotate|s0/strip2/work/1/0/1/1/0|s0/strip2/work/1/0/1/1/0|312, 1540, 966, 270|0||
|54|cut|s0/strip2/work/1/0/1/1/0|s0/strip2/work/1/0/1/1/0/0, s0/strip2/work/1/0/1/1/0/1|312, 1540, 966, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|55|feed|s0/strip2/work/1/0/1/1/0/1||737, 1540, 541, 270|0||
|56|cut|s0/strip2/work/1/0/1/1/0/1|s0/strip2/work/1/0/1/1/0/1/0, s0/strip2/work/1/0/1/1/0/1/1|737, 1540, 541, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|57|feed|s0/strip2/work/1/1||1283, 413, 1447, 1407|180||
|58|cut|s0/strip2/work/1/1|s0/strip2/work/1/1/1, s0/strip2/work/1/1/0|1283, 413, 1447, 1407|180|V {&quot;x&quot;:442,&quot;y&quot;:0} → {&quot;x&quot;:442,&quot;y&quot;:1407}|
|59|feed|s0/strip2/work/1/1/0||1283, 413, 1000, 1407|180||
|60|rotate|s0/strip2/work/1/1/0|s0/strip2/work/1/1/0|1283, 413, 1000, 1407|270||
|61|cut|s0/strip2/work/1/1/0|s0/strip2/work/1/1/0/0, s0/strip2/work/1/1/0/1|1283, 413, 1000, 1407|270|V {&quot;x&quot;:219,&quot;y&quot;:0} → {&quot;x&quot;:219,&quot;y&quot;:1000}|
|62|feed|s0/strip2/work/1/1/0/1||1283, 637, 1000, 1183|270||
|63|cut|s0/strip2/work/1/1/0/1|s0/strip2/work/1/1/0/1/0, s0/strip2/work/1/1/0/1/1|1283, 637, 1000, 1183|270|V {&quot;x&quot;:398,&quot;y&quot;:0} → {&quot;x&quot;:398,&quot;y&quot;:1000}|
|64|feed|s0/strip2/work/1/1/0/1/0||1283, 637, 1000, 398|270||
|65|rotate|s0/strip2/work/1/1/0/1/0|s0/strip2/work/1/1/0/1/0|1283, 637, 1000, 398|0||
|66|cut|s0/strip2/work/1/1/0/1/0|s0/strip2/work/1/1/0/1/0/0, s0/strip2/work/1/1/0/1/0/1|1283, 637, 1000, 398|0|V {&quot;x&quot;:966,&quot;y&quot;:0} → {&quot;x&quot;:966,&quot;y&quot;:398}|
|67|feed|s0/strip2/work/1/1/0/1/1||1283, 1040, 1000, 780|270||
|68|cut|s0/strip2/work/1/1/0/1/1|s0/strip2/work/1/1/0/1/1/0, s0/strip2/work/1/1/0/1/1/1|1283, 1040, 1000, 780|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:1000}|
|69|feed|s0/strip2/work/1/1/0/1/1/0||1283, 1040, 1000, 270|270||
|70|rotate|s0/strip2/work/1/1/0/1/1/0|s0/strip2/work/1/1/0/1/1/0|1283, 1040, 1000, 270|0||
|71|cut|s0/strip2/work/1/1/0/1/1/0|s0/strip2/work/1/1/0/1/1/0/0, s0/strip2/work/1/1/0/1/1/0/1|1283, 1040, 1000, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|72|feed|s0/strip2/work/1/1/0/1/1/0/1||1708, 1040, 575, 270|0||
|73|cut|s0/strip2/work/1/1/0/1/1/0/1|s0/strip2/work/1/1/0/1/1/0/1/0, s0/strip2/work/1/1/0/1/1/0/1/1|1708, 1040, 575, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|74|feed|s0/strip2/work/1/1/0/1/1/1||1283, 1315, 1000, 505|270||
|75|cut|s0/strip2/work/1/1/0/1/1/1|s0/strip2/work/1/1/0/1/1/1/0, s0/strip2/work/1/1/0/1/1/1/1|1283, 1315, 1000, 505|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:1000}|
|76|feed|s0/strip2/work/1/1/0/1/1/1/0||1283, 1315, 1000, 270|270||
|77|rotate|s0/strip2/work/1/1/0/1/1/1/0|s0/strip2/work/1/1/0/1/1/1/0|1283, 1315, 1000, 270|0||
|78|cut|s0/strip2/work/1/1/0/1/1/1/0|s0/strip2/work/1/1/0/1/1/1/0/0, s0/strip2/work/1/1/0/1/1/1/0/1|1283, 1315, 1000, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|79|feed|s0/strip2/work/1/1/0/1/1/1/0/1||1708, 1315, 575, 270|0||
|80|cut|s0/strip2/work/1/1/0/1/1/1/0/1|s0/strip2/work/1/1/0/1/1/1/0/1/0, s0/strip2/work/1/1/0/1/1/1/0/1/1|1708, 1315, 575, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|81|feed|s0/strip2/work/1/1/0/1/1/1/1||1283, 1590, 1000, 230|270||
|82|cut|s0/strip2/work/1/1/0/1/1/1/1|s0/strip2/work/1/1/0/1/1/1/1/0, s0/strip2/work/1/1/0/1/1/1/1/1|1283, 1590, 1000, 230|270|V {&quot;x&quot;:180,&quot;y&quot;:0} → {&quot;x&quot;:180,&quot;y&quot;:1000}|
|83|feed|s0/strip2/work/1/1/0/1/1/1/1/0||1283, 1590, 1000, 180|270||
|84|rotate|s0/strip2/work/1/1/0/1/1/1/1/0|s0/strip2/work/1/1/0/1/1/1/1/0|1283, 1590, 1000, 180|0||
|85|cut|s0/strip2/work/1/1/0/1/1/1/1/0|s0/strip2/work/1/1/0/1/1/1/1/0/0, s0/strip2/work/1/1/0/1/1/1/1/0/1|1283, 1590, 1000, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|86|feed|s0/strip2/work/1/1/0/1/1/1/1/0/1||1526, 1590, 757, 180|0||
|87|cut|s0/strip2/work/1/1/0/1/1/1/1/0/1|s0/strip2/work/1/1/0/1/1/1/1/0/1/0, s0/strip2/work/1/1/0/1/1/1/1/0/1/1|1526, 1590, 757, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|88|feed|s0/strip2/work/1/1/0/1/1/1/1/0/1/1||1769, 1590, 514, 180|0||
|89|cut|s0/strip2/work/1/1/0/1/1/1/1/0/1/1|s0/strip2/work/1/1/0/1/1/1/1/0/1/1/0, s0/strip2/work/1/1/0/1/1/1/1/0/1/1/1|1769, 1590, 514, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|90|feed|s0/strip2/work/1/1/0/1/1/1/1/0/1/1/1||2012, 1590, 271, 180|0||
|91|cut|s0/strip2/work/1/1/0/1/1/1/1/0/1/1/1|s0/strip2/work/1/1/0/1/1/1/1/0/1/1/1/0, s0/strip2/work/1/1/0/1/1/1/1/0/1/1/1/1|2012, 1590, 271, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|92|feed|s0/strip2/work/1/1/1||2288, 413, 442, 1407|180||
|93|cut|s0/strip2/work/1/1/1|s0/strip2/work/1/1/1/1, s0/strip2/work/1/1/1/0|2288, 413, 442, 1407|180|V {&quot;x&quot;:17,&quot;y&quot;:0} → {&quot;x&quot;:17,&quot;y&quot;:1407}|
|94|feed|s0/strip2/work/1/1/1/0||2288, 413, 420, 1407|180||
|95|rotate|s0/strip2/work/1/1/1/0|s0/strip2/work/1/1/1/0|2288, 413, 420, 1407|270||
|96|cut|s0/strip2/work/1/1/1/0|s0/strip2/work/1/1/1/0/0, s0/strip2/work/1/1/1/0/1|2288, 413, 420, 1407|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:420}|
|97|feed|s0/strip2/work/1/1/1/0/1||2288, 688, 420, 1132|270||
|98|cut|s0/strip2/work/1/1/1/0/1|s0/strip2/work/1/1/1/0/1/0, s0/strip2/work/1/1/1/0/1/1|2288, 688, 420, 1132|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:420}|
|99|feed|s0/strip2/work/1/1/1/0/1/1||2288, 963, 420, 857|270||
|100|cut|s0/strip2/work/1/1/1/0/1/1|s0/strip2/work/1/1/1/0/1/1/0, s0/strip2/work/1/1/1/0/1/1/1|2288, 963, 420, 857|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:420}|
|101|feed|s0/strip2/work/1/1/1/0/1/1/1||2288, 1238, 420, 582|270||
|102|cut|s0/strip2/work/1/1/1/0/1/1/1|s0/strip2/work/1/1/1/0/1/1/1/0, s0/strip2/work/1/1/1/0/1/1/1/1|2288, 1238, 420, 582|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:420}|
