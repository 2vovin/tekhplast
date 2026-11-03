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
|43|cut|s0/strip1/work/1/1|s0/strip1/work/1/1/0, s0/strip1/work/1/1/1|981, 285, 1749, 1535|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:1749}|
|44|feed|s0/strip1/work/1/1/0||981, 285, 1749, 270|270||
|45|rotate|s0/strip1/work/1/1/0|s0/strip1/work/1/1/0|981, 285, 1749, 270|0||
|46|cut|s0/strip1/work/1/1/0|s0/strip1/work/1/1/0/0, s0/strip1/work/1/1/0/1|981, 285, 1749, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|47|feed|s0/strip1/work/1/1/0/1||1406, 285, 1324, 270|0||
|48|cut|s0/strip1/work/1/1/0/1|s0/strip1/work/1/1/0/1/0, s0/strip1/work/1/1/0/1/1|1406, 285, 1324, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|49|feed|s0/strip1/work/1/1/0/1/1||1831, 285, 899, 270|0||
|50|cut|s0/strip1/work/1/1/0/1/1|s0/strip1/work/1/1/0/1/1/0, s0/strip1/work/1/1/0/1/1/1|1831, 285, 899, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|51|feed|s0/strip1/work/1/1/0/1/1/1||2256, 285, 474, 270|0||
|52|cut|s0/strip1/work/1/1/0/1/1/1|s0/strip1/work/1/1/0/1/1/1/0, s0/strip1/work/1/1/0/1/1/1/1|2256, 285, 474, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|53|feed|s0/strip1/work/1/1/1||981, 560, 1749, 1260|270||
|54|rotate|s0/strip1/work/1/1/1|s0/strip1/work/1/1/1|981, 560, 1749, 1260|0||
|55|cut|s0/strip1/work/1/1/1|s0/strip1/work/1/1/1/0, s0/strip1/work/1/1/1/1|981, 560, 1749, 1260|0|V {&quot;x&quot;:1132,&quot;y&quot;:0} → {&quot;x&quot;:1132,&quot;y&quot;:1260}|
|56|feed|s0/strip1/work/1/1/1/0||981, 560, 1132, 1260|0||
|57|rotate|s0/strip1/work/1/1/1/0|s0/strip1/work/1/1/1/0|981, 560, 1132, 1260|90||
|58|cut|s0/strip1/work/1/1/1/0|s0/strip1/work/1/1/1/0/1, s0/strip1/work/1/1/1/0/0|981, 560, 1132, 1260|90|V {&quot;x&quot;:857,&quot;y&quot;:0} → {&quot;x&quot;:857,&quot;y&quot;:1132}|
|59|feed|s0/strip1/work/1/1/1/0/1||981, 963, 1132, 857|90||
|60|cut|s0/strip1/work/1/1/1/0/1|s0/strip1/work/1/1/1/0/1/1, s0/strip1/work/1/1/1/0/1/0|981, 963, 1132, 857|90|V {&quot;x&quot;:454,&quot;y&quot;:0} → {&quot;x&quot;:454,&quot;y&quot;:1132}|
|61|feed|s0/strip1/work/1/1/1/0/1/1||981, 1366, 1132, 454|90||
|62|rotate|s0/strip1/work/1/1/1/0/1/1|s0/strip1/work/1/1/1/0/1/1|981, 1366, 1132, 454|180||
|63|cut|s0/strip1/work/1/1/1/0/1/1|s0/strip1/work/1/1/1/0/1/1/1, s0/strip1/work/1/1/1/0/1/1/0|981, 1366, 1132, 454|180|V {&quot;x&quot;:127,&quot;y&quot;:0} → {&quot;x&quot;:127,&quot;y&quot;:454}|
|64|feed|s0/strip1/work/1/1/1/0/1/1/0||981, 1366, 1000, 454|180||
|65|rotate|s0/strip1/work/1/1/1/0/1/1/0|s0/strip1/work/1/1/1/0/1/1/0|981, 1366, 1000, 454|270||
|66|cut|s0/strip1/work/1/1/1/0/1/1/0|s0/strip1/work/1/1/1/0/1/1/0/0, s0/strip1/work/1/1/1/0/1/1/0/1|981, 1366, 1000, 454|270|V {&quot;x&quot;:219,&quot;y&quot;:0} → {&quot;x&quot;:219,&quot;y&quot;:1000}|
|67|feed|s0/strip1/work/1/1/1/0/1/1/0/1||981, 1590, 1000, 230|270||
|68|cut|s0/strip1/work/1/1/1/0/1/1/0/1|s0/strip1/work/1/1/1/0/1/1/0/1/0, s0/strip1/work/1/1/1/0/1/1/0/1/1|981, 1590, 1000, 230|270|V {&quot;x&quot;:180,&quot;y&quot;:0} → {&quot;x&quot;:180,&quot;y&quot;:1000}|
|69|feed|s0/strip1/work/1/1/1/0/1/1/0/1/0||981, 1590, 1000, 180|270||
|70|rotate|s0/strip1/work/1/1/1/0/1/1/0/1/0|s0/strip1/work/1/1/1/0/1/1/0/1/0|981, 1590, 1000, 180|0||
|71|cut|s0/strip1/work/1/1/1/0/1/1/0/1/0|s0/strip1/work/1/1/1/0/1/1/0/1/0/0, s0/strip1/work/1/1/1/0/1/1/0/1/0/1|981, 1590, 1000, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|72|feed|s0/strip1/work/1/1/1/0/1/1/0/1/0/1||1224, 1590, 757, 180|0||
|73|cut|s0/strip1/work/1/1/1/0/1/1/0/1/0/1|s0/strip1/work/1/1/1/0/1/1/0/1/0/1/0, s0/strip1/work/1/1/1/0/1/1/0/1/0/1/1|1224, 1590, 757, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|74|feed|s0/strip1/work/1/1/1/0/1/1/0/1/0/1/1||1467, 1590, 514, 180|0||
|75|cut|s0/strip1/work/1/1/1/0/1/1/0/1/0/1/1|s0/strip1/work/1/1/1/0/1/1/0/1/0/1/1/0, s0/strip1/work/1/1/1/0/1/1/0/1/0/1/1/1|1467, 1590, 514, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|76|feed|s0/strip1/work/1/1/1/0/1/1/0/1/0/1/1/1||1710, 1590, 271, 180|0||
|77|cut|s0/strip1/work/1/1/1/0/1/1/0/1/0/1/1/1|s0/strip1/work/1/1/1/0/1/1/0/1/0/1/1/1/0, s0/strip1/work/1/1/1/0/1/1/0/1/0/1/1/1/1|1710, 1590, 271, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|78|feed|s0/strip1/work/1/1/1/1||2118, 560, 612, 1260|0||
|79|cut|s0/strip1/work/1/1/1/1|s0/strip1/work/1/1/1/1/0, s0/strip1/work/1/1/1/1/1|2118, 560, 612, 1260|0|V {&quot;x&quot;:297,&quot;y&quot;:0} → {&quot;x&quot;:297,&quot;y&quot;:1260}|
|80|feed|s0/strip1/work/1/1/1/1/0||2118, 560, 297, 1260|0||
|81|rotate|s0/strip1/work/1/1/1/1/0|s0/strip1/work/1/1/1/1/0|2118, 560, 297, 1260|90||
|82|cut|s0/strip1/work/1/1/1/1/0|s0/strip1/work/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/0/0|2118, 560, 297, 1260|90|V {&quot;x&quot;:958,&quot;y&quot;:0} → {&quot;x&quot;:958,&quot;y&quot;:297}|
|83|feed|s0/strip1/work/1/1/1/1/0/1||2118, 862, 297, 958|90||
|84|cut|s0/strip1/work/1/1/1/1/0/1|s0/strip1/work/1/1/1/1/0/1/1, s0/strip1/work/1/1/1/1/0/1/0|2118, 862, 297, 958|90|V {&quot;x&quot;:656,&quot;y&quot;:0} → {&quot;x&quot;:656,&quot;y&quot;:297}|
|85|feed|s0/strip1/work/1/1/1/1/0/1/1||2118, 1164, 297, 656|90||
|86|cut|s0/strip1/work/1/1/1/1/0/1/1|s0/strip1/work/1/1/1/1/0/1/1/1, s0/strip1/work/1/1/1/1/0/1/1/0|2118, 1164, 297, 656|90|V {&quot;x&quot;:354,&quot;y&quot;:0} → {&quot;x&quot;:354,&quot;y&quot;:297}|
|87|feed|s0/strip1/work/1/1/1/1/0/1/1/1||2118, 1466, 297, 354|90||
|88|cut|s0/strip1/work/1/1/1/1/0/1/1/1|s0/strip1/work/1/1/1/1/0/1/1/1/1, s0/strip1/work/1/1/1/1/0/1/1/1/0|2118, 1466, 297, 354|90|V {&quot;x&quot;:52,&quot;y&quot;:0} → {&quot;x&quot;:52,&quot;y&quot;:297}|
|89|feed|s0/strip1/work/1/1/1/1/1||2420, 560, 310, 1260|0||
|90|rotate|s0/strip1/work/1/1/1/1/1|s0/strip1/work/1/1/1/1/1|2420, 560, 310, 1260|90||
|91|cut|s0/strip1/work/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/0|2420, 560, 310, 1260|90|V {&quot;x&quot;:958,&quot;y&quot;:0} → {&quot;x&quot;:958,&quot;y&quot;:310}|
|92|feed|s0/strip1/work/1/1/1/1/1/0||2420, 560, 310, 297|90||
|93|rotate|s0/strip1/work/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/0|2420, 560, 310, 297|180||
|94|cut|s0/strip1/work/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/1/0/0|2420, 560, 310, 297|180|V {&quot;x&quot;:8,&quot;y&quot;:0} → {&quot;x&quot;:8,&quot;y&quot;:297}|
|95|feed|s0/strip1/work/1/1/1/1/1/1||2420, 862, 310, 958|90||
|96|cut|s0/strip1/work/1/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/1/0|2420, 862, 310, 958|90|V {&quot;x&quot;:773,&quot;y&quot;:0} → {&quot;x&quot;:773,&quot;y&quot;:310}|
|97|feed|s0/strip1/work/1/1/1/1/1/1/0||2420, 862, 310, 180|90||
|98|rotate|s0/strip1/work/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/0|2420, 862, 310, 180|180||
|99|cut|s0/strip1/work/1/1/1/1/1/1/0|s0/strip1/work/1/1/1/1/1/1/0/1, s0/strip1/work/1/1/1/1/1/1/0/0|2420, 862, 310, 180|180|V {&quot;x&quot;:67,&quot;y&quot;:0} → {&quot;x&quot;:67,&quot;y&quot;:180}|
