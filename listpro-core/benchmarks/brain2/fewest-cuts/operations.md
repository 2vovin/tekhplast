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
|32|cut|s0/strip1/work/1|s0/strip1/work/1/0, s0/strip1/work/1/1|981, 10, 1749, 1810|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:1749}|
|33|feed|s0/strip1/work/1/0||981, 10, 1749, 270|270||
|34|rotate|s0/strip1/work/1/0|s0/strip1/work/1/0|981, 10, 1749, 270|0||
|35|cut|s0/strip1/work/1/0|s0/strip1/work/1/0/0, s0/strip1/work/1/0/1|981, 10, 1749, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|36|feed|s0/strip1/work/1/0/1||1406, 10, 1324, 270|0||
|37|cut|s0/strip1/work/1/0/1|s0/strip1/work/1/0/1/0, s0/strip1/work/1/0/1/1|1406, 10, 1324, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|38|feed|s0/strip1/work/1/0/1/1||1831, 10, 899, 270|0||
|39|cut|s0/strip1/work/1/0/1/1|s0/strip1/work/1/0/1/1/0, s0/strip1/work/1/0/1/1/1|1831, 10, 899, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|40|feed|s0/strip1/work/1/0/1/1/1||2256, 10, 474, 270|0||
|41|cut|s0/strip1/work/1/0/1/1/1|s0/strip1/work/1/0/1/1/1/0, s0/strip1/work/1/0/1/1/1/1|2256, 10, 474, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|42|feed|s0/strip1/work/1/1||981, 285, 1749, 1535|270||
|43|rotate|s0/strip1/work/1/1|s0/strip1/work/1/1|981, 285, 1749, 1535|0||
|44|cut|s0/strip1/work/1/1|s0/strip1/work/1/1/0, s0/strip1/work/1/1/1|981, 285, 1749, 1535|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:1535}|
|45|feed|s0/strip1/work/1/1/0||981, 285, 420, 1535|0||
|46|rotate|s0/strip1/work/1/1/0|s0/strip1/work/1/1/0|981, 285, 420, 1535|90||
|47|cut|s0/strip1/work/1/1/0|s0/strip1/work/1/1/0/1, s0/strip1/work/1/1/0/0|981, 285, 420, 1535|90|V {&quot;x&quot;:1260,&quot;y&quot;:0} → {&quot;x&quot;:1260,&quot;y&quot;:420}|
|48|feed|s0/strip1/work/1/1/0/1||981, 560, 420, 1260|90||
|49|cut|s0/strip1/work/1/1/0/1|s0/strip1/work/1/1/0/1/1, s0/strip1/work/1/1/0/1/0|981, 560, 420, 1260|90|V {&quot;x&quot;:985,&quot;y&quot;:0} → {&quot;x&quot;:985,&quot;y&quot;:420}|
|50|feed|s0/strip1/work/1/1/0/1/1||981, 835, 420, 985|90||
|51|cut|s0/strip1/work/1/1/0/1/1|s0/strip1/work/1/1/0/1/1/1, s0/strip1/work/1/1/0/1/1/0|981, 835, 420, 985|90|V {&quot;x&quot;:710,&quot;y&quot;:0} → {&quot;x&quot;:710,&quot;y&quot;:420}|
|52|feed|s0/strip1/work/1/1/0/1/1/1||981, 1110, 420, 710|90||
|53|cut|s0/strip1/work/1/1/0/1/1/1|s0/strip1/work/1/1/0/1/1/1/1, s0/strip1/work/1/1/0/1/1/1/0|981, 1110, 420, 710|90|V {&quot;x&quot;:435,&quot;y&quot;:0} → {&quot;x&quot;:435,&quot;y&quot;:420}|
|54|feed|s0/strip1/work/1/1/0/1/1/1/1||981, 1385, 420, 435|90||
|55|cut|s0/strip1/work/1/1/0/1/1/1/1|s0/strip1/work/1/1/0/1/1/1/1/1, s0/strip1/work/1/1/0/1/1/1/1/0|981, 1385, 420, 435|90|V {&quot;x&quot;:133,&quot;y&quot;:0} → {&quot;x&quot;:133,&quot;y&quot;:420}|
|56|feed|s0/strip1/work/1/1/0/1/1/1/1/0||981, 1385, 420, 297|90||
|57|rotate|s0/strip1/work/1/1/0/1/1/1/1/0|s0/strip1/work/1/1/0/1/1/1/1/0|981, 1385, 420, 297|180||
|58|cut|s0/strip1/work/1/1/0/1/1/1/1/0|s0/strip1/work/1/1/0/1/1/1/1/0/1, s0/strip1/work/1/1/0/1/1/1/1/0/0|981, 1385, 420, 297|180|V {&quot;x&quot;:118,&quot;y&quot;:0} → {&quot;x&quot;:118,&quot;y&quot;:297}|
|59|feed|s0/strip1/work/1/1/1||1406, 285, 1324, 1535|0||
|60|rotate|s0/strip1/work/1/1/1|s0/strip1/work/1/1/1|1406, 285, 1324, 1535|90||
|61|cut|s0/strip1/work/1/1/1|s0/strip1/work/1/1/1/1, s0/strip1/work/1/1/1/0|1406, 285, 1324, 1535|90|V {&quot;x&quot;:1132,&quot;y&quot;:0} → {&quot;x&quot;:1132,&quot;y&quot;:1324}|
|62|feed|s0/strip1/work/1/1/1/0||1406, 285, 1324, 398|90||
|63|rotate|s0/strip1/work/1/1/1/0|s0/strip1/work/1/1/1/0|1406, 285, 1324, 398|180||
|64|cut|s0/strip1/work/1/1/1/0|s0/strip1/work/1/1/1/0/1, s0/strip1/work/1/1/1/0/0|1406, 285, 1324, 398|180|V {&quot;x&quot;:187,&quot;y&quot;:0} → {&quot;x&quot;:187,&quot;y&quot;:398}|
|65|feed|s0/strip1/work/1/1/1/1||1406, 688, 1324, 1132|90||
|66|cut|s0/strip1/work/1/1/1/1|s0/strip1/work/1/1/1/1/1, s0/strip1/work/1/1/1/1/0|1406, 688, 1324, 1132|90|V {&quot;x&quot;:729,&quot;y&quot;:0} → {&quot;x&quot;:729,&quot;y&quot;:1324}|
|67|feed|s0/strip1/work/1/1/1/1/0||1406, 688, 1324, 398|90||
|68|rotate|s0/strip1/work/1/1/1/1/0|s0/strip1/work/1/1/1/1/0|1406, 688, 1324, 398|180||
|69|cut|s0/strip1/work/1/1/1/1/0|s0/strip1/work/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/0/0|1406, 688, 1324, 398|180|V {&quot;x&quot;:187,&quot;y&quot;:0} → {&quot;x&quot;:187,&quot;y&quot;:398}|
|70|feed|s0/strip1/work/1/1/1/1/1||1406, 1091, 1324, 729|90||
|71|cut|s0/strip1/work/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/0|1406, 1091, 1324, 729|90|V {&quot;x&quot;:427,&quot;y&quot;:0} → {&quot;x&quot;:427,&quot;y&quot;:1324}|
|72|feed|s0/strip1/work/1/1/1/1/1/0||1406, 1091, 1324, 297|90||
|73|rotate|s0/strip1/work/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/0|1406, 1091, 1324, 297|180||
|74|cut|s0/strip1/work/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/1/0/0|1406, 1091, 1324, 297|180|V {&quot;x&quot;:1022,&quot;y&quot;:0} → {&quot;x&quot;:1022,&quot;y&quot;:297}|
|75|feed|s0/strip1/work/1/1/1/1/1/0/1||1708, 1091, 1022, 297|180||
|76|cut|s0/strip1/work/1/1/1/1/1/0/1|s0/strip1/work/1/1/1/1/1/0/1/1, s0/strip1/work/1/1/1/1/1/0/1/0|1708, 1091, 1022, 297|180|V {&quot;x&quot;:720,&quot;y&quot;:0} → {&quot;x&quot;:720,&quot;y&quot;:297}|
|77|feed|s0/strip1/work/1/1/1/1/1/0/1/1||2010, 1091, 720, 297|180||
|78|cut|s0/strip1/work/1/1/1/1/1/0/1/1|s0/strip1/work/1/1/1/1/1/0/1/1/1, s0/strip1/work/1/1/1/1/1/0/1/1/0|2010, 1091, 720, 297|180|V {&quot;x&quot;:418,&quot;y&quot;:0} → {&quot;x&quot;:418,&quot;y&quot;:297}|
|79|feed|s0/strip1/work/1/1/1/1/1/0/1/1/1||2312, 1091, 418, 297|180||
|80|cut|s0/strip1/work/1/1/1/1/1/0/1/1/1|s0/strip1/work/1/1/1/1/1/0/1/1/1/1, s0/strip1/work/1/1/1/1/1/0/1/1/1/0|2312, 1091, 418, 297|180|V {&quot;x&quot;:116,&quot;y&quot;:0} → {&quot;x&quot;:116,&quot;y&quot;:297}|
|81|feed|s0/strip1/work/1/1/1/1/1/1||1406, 1393, 1324, 427|90||
|82|cut|s0/strip1/work/1/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/1/0|1406, 1393, 1324, 427|90|V {&quot;x&quot;:242,&quot;y&quot;:0} → {&quot;x&quot;:242,&quot;y&quot;:1324}|
|83|feed|s0/strip1/work/1/1/1/1/1/1/0||1406, 1393, 1324, 180|90||
|84|rotate|s0/strip1/work/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/0|1406, 1393, 1324, 180|180||
|85|cut|s0/strip1/work/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/1/1/0/0|1406, 1393, 1324, 180|180|V {&quot;x&quot;:1081,&quot;y&quot;:0} → {&quot;x&quot;:1081,&quot;y&quot;:180}|
|86|feed|s0/strip1/work/1/1/1/1/1/1/0/1||1649, 1393, 1081, 180|180||
|87|cut|s0/strip1/work/1/1/1/1/1/1/0/1|s0/strip1/work/1/1/1/1/1/1/0/1/1, s0/strip1/work/1/1/1/1/1/1/0/1/0|1649, 1393, 1081, 180|180|V {&quot;x&quot;:838,&quot;y&quot;:0} → {&quot;x&quot;:838,&quot;y&quot;:180}|
|88|feed|s0/strip1/work/1/1/1/1/1/1/0/1/1||1892, 1393, 838, 180|180||
|89|cut|s0/strip1/work/1/1/1/1/1/1/0/1/1|s0/strip1/work/1/1/1/1/1/1/0/1/1/1, s0/strip1/work/1/1/1/1/1/1/0/1/1/0|1892, 1393, 838, 180|180|V {&quot;x&quot;:595,&quot;y&quot;:0} → {&quot;x&quot;:595,&quot;y&quot;:180}|
|90|feed|s0/strip1/work/1/1/1/1/1/1/0/1/1/1||2135, 1393, 595, 180|180||
|91|cut|s0/strip1/work/1/1/1/1/1/1/0/1/1/1|s0/strip1/work/1/1/1/1/1/1/0/1/1/1/1, s0/strip1/work/1/1/1/1/1/1/0/1/1/1/0|2135, 1393, 595, 180|180|V {&quot;x&quot;:352,&quot;y&quot;:0} → {&quot;x&quot;:352,&quot;y&quot;:180}|
|92|feed|s0/strip1/work/1/1/1/1/1/1/0/1/1/1/1||2378, 1393, 352, 180|180||
|93|cut|s0/strip1/work/1/1/1/1/1/1/0/1/1/1/1|s0/strip1/work/1/1/1/1/1/1/0/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/1/0/1/1/1/1/0|2378, 1393, 352, 180|180|V {&quot;x&quot;:109,&quot;y&quot;:0} → {&quot;x&quot;:109,&quot;y&quot;:180}|
|94|feed|s0/strip1/work/1/1/1/1/1/1/1||1406, 1578, 1324, 242|90||
|95|cut|s0/strip1/work/1/1/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/1/1/0|1406, 1578, 1324, 242|90|V {&quot;x&quot;:18,&quot;y&quot;:0} → {&quot;x&quot;:18,&quot;y&quot;:1324}|
|96|feed|s0/strip1/work/1/1/1/1/1/1/1/0||1406, 1578, 1324, 219|90||
|97|rotate|s0/strip1/work/1/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/1/0|1406, 1578, 1324, 219|180||
|98|cut|s0/strip1/work/1/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/1/1/1/0/0|1406, 1578, 1324, 219|180|V {&quot;x&quot;:319,&quot;y&quot;:0} → {&quot;x&quot;:319,&quot;y&quot;:219}|
