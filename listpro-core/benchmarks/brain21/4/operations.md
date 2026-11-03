# Brain 2.1 — physical operations

Machine feasibility: unknown. CUT endpoints use local coordinates of the current physical blank. Material rectangles retain original grain coordinates. All dimensions are mm.

|Step|Type|Input|Output|Material x,y,w,h|Orientation|Machine axis and segment|
|---:|---|---|---|---|---|---|
|1|load|s0/raw|||0||
|2|cut|s0/raw|s0/side0, s0/side-rem|0, 0, 2750, 1830|0|V {&quot;x&quot;:5,&quot;y&quot;:0} → {&quot;x&quot;:5,&quot;y&quot;:1830}|
|3|feed|s0/side-rem||10, 0, 2740, 1830|0||
|4|cut|s0/side-rem|s0/body, s0/side1|10, 0, 2740, 1830|0|V {&quot;x&quot;:2730,&quot;y&quot;:0} → {&quot;x&quot;:2730,&quot;y&quot;:1830}|
|5|feed|s0/body||10, 0, 2730, 1830|0||
|6|cut|s0/body|s0/strip1, s0/rip-rem0|10, 0, 2730, 1830|0|V {&quot;x&quot;:1749,&quot;y&quot;:0} → {&quot;x&quot;:1749,&quot;y&quot;:1830}|
|7|feed|s0/rip-rem0||1764, 0, 976, 1830|0||
|8|cut|s0/rip-rem0|s0/strip2, s0/rip-rem1|1764, 0, 976, 1830|0|V {&quot;x&quot;:966,&quot;y&quot;:0} → {&quot;x&quot;:966,&quot;y&quot;:1830}|
|9|endPrimary||s0/strip1, s0/strip2||||
|10|feed|s0/strip1||10, 0, 1749, 1830|0||
|11|rotate|s0/strip1|s0/strip1|10, 0, 1749, 1830|90||
|12|cut|s0/strip1|s0/strip1/after-top, s0/strip1/top|10, 0, 1749, 1830|90|V {&quot;x&quot;:1820,&quot;y&quot;:0} → {&quot;x&quot;:1820,&quot;y&quot;:1749}|
|13|feed|s0/strip2||1764, 0, 966, 1830|0||
|14|rotate|s0/strip2|s0/strip2|1764, 0, 966, 1830|90||
|15|cut|s0/strip2|s0/strip2/after-top, s0/strip2/top|1764, 0, 966, 1830|90|V {&quot;x&quot;:1820,&quot;y&quot;:0} → {&quot;x&quot;:1820,&quot;y&quot;:966}|
|16|feed|s0/strip1/after-top||10, 10, 1749, 1820|90||
|17|cut|s0/strip1/after-top|s0/strip1/bottom, s0/strip1/work|10, 10, 1749, 1820|90|V {&quot;x&quot;:5,&quot;y&quot;:0} → {&quot;x&quot;:5,&quot;y&quot;:1749}|
|18|feed|s0/strip2/after-top||1764, 10, 966, 1820|90||
|19|cut|s0/strip2/after-top|s0/strip2/bottom, s0/strip2/work|1764, 10, 966, 1820|90|V {&quot;x&quot;:5,&quot;y&quot;:0} → {&quot;x&quot;:5,&quot;y&quot;:966}|
|20|feed|s0/strip1/work||10, 10, 1749, 1810|90||
|21|cut|s0/strip1/work|s0/strip1/work/1, s0/strip1/work/0|10, 10, 1749, 1810|90|V {&quot;x&quot;:975,&quot;y&quot;:0} → {&quot;x&quot;:975,&quot;y&quot;:1749}|
|22|feed|s0/strip2/work||1764, 10, 966, 1810|90||
|23|cut|s0/strip2/work|s0/strip2/work/1, s0/strip2/work/0|1764, 10, 966, 1810|90|V {&quot;x&quot;:1086,&quot;y&quot;:0} → {&quot;x&quot;:1086,&quot;y&quot;:966}|
|24|feed|s0/strip2/work/1||1764, 734, 966, 1086|90||
|25|cut|s0/strip2/work/1|s0/strip2/work/1/1, s0/strip2/work/1/0|1764, 734, 966, 1086|90|V {&quot;x&quot;:683,&quot;y&quot;:0} → {&quot;x&quot;:683,&quot;y&quot;:966}|
|26|feed|s0/strip1/work/1||10, 845, 1749, 975|90||
|27|cut|s0/strip1/work/1|s0/strip1/work/1/1, s0/strip1/work/1/0|10, 845, 1749, 975|90|V {&quot;x&quot;:572,&quot;y&quot;:0} → {&quot;x&quot;:572,&quot;y&quot;:1749}|
|28|feed|s0/strip1/work/1/0||10, 845, 1749, 398|90||
|29|rotate|s0/strip1/work/1/0|s0/strip1/work/1/0|10, 845, 1749, 398|180||
|30|cut|s0/strip1/work/1/0|s0/strip1/work/1/0/1, s0/strip1/work/1/0/0|10, 845, 1749, 398|180|V {&quot;x&quot;:612,&quot;y&quot;:0} → {&quot;x&quot;:612,&quot;y&quot;:398}|
|31|feed|s0/strip1/work/1/0/1||1147, 845, 612, 398|180||
|32|rotate|s0/strip1/work/1/0/1|s0/strip1/work/1/0/1|1147, 845, 612, 398|270||
|33|cut|s0/strip1/work/1/0/1|s0/strip1/work/1/0/1/0, s0/strip1/work/1/0/1/1|1147, 845, 612, 398|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:612}|
|34|feed|s0/strip1/work/1/1||10, 1248, 1749, 572|90||
|35|cut|s0/strip1/work/1/1|s0/strip1/work/1/1/1, s0/strip1/work/1/1/0|10, 1248, 1749, 572|90|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:1749}|
|36|feed|s0/strip1/work/0||10, 10, 1749, 830|90||
|37|rotate|s0/strip1/work/0|s0/strip1/work/0|10, 10, 1749, 830|180||
|38|cut|s0/strip1/work/0|s0/strip1/work/0/1, s0/strip1/work/0/0|10, 10, 1749, 830|180|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:830}|
|39|feed|s0/strip1/work/1/0/1/0||1147, 845, 612, 270|270||
|40|rotate|s0/strip1/work/1/0/1/0|s0/strip1/work/1/0/1/0|1147, 845, 612, 270|0||
|41|cut|s0/strip1/work/1/0/1/0|s0/strip1/work/1/0/1/0/0, s0/strip1/work/1/0/1/0/1|1147, 845, 612, 270|0|V {&quot;x&quot;:420,&quot;y&quot;:0} → {&quot;x&quot;:420,&quot;y&quot;:270}|
|42|feed|s0/strip1/work/0/1||1339, 10, 420, 830|180||
|43|rotate|s0/strip1/work/0/1|s0/strip1/work/0/1|1339, 10, 420, 830|270||
|44|cut|s0/strip1/work/0/1|s0/strip1/work/0/1/0, s0/strip1/work/0/1/1|1339, 10, 420, 830|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:420}|
|45|feed|s0/strip1/work/0/1/1||1339, 285, 420, 555|270||
|46|cut|s0/strip1/work/0/1/1|s0/strip1/work/0/1/1/0, s0/strip1/work/0/1/1/1|1339, 285, 420, 555|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:420}|
|47|feed|s0/strip1/work/0/1/1/1||1339, 560, 420, 280|270||
|48|cut|s0/strip1/work/0/1/1/1|s0/strip1/work/0/1/1/1/0, s0/strip1/work/0/1/1/1/1|1339, 560, 420, 280|270|V {&quot;x&quot;:270,&quot;y&quot;:0} → {&quot;x&quot;:270,&quot;y&quot;:420}|
|49|feed|s0/strip2/work/1/1||1764, 1137, 966, 683|90||
|50|cut|s0/strip2/work/1/1|s0/strip2/work/1/1/1, s0/strip2/work/1/1/0|1764, 1137, 966, 683|90|V {&quot;x&quot;:280,&quot;y&quot;:0} → {&quot;x&quot;:280,&quot;y&quot;:966}|
|51|feed|s0/strip1/work/0/0||10, 10, 1324, 830|180||
|52|rotate|s0/strip1/work/0/0|s0/strip1/work/0/0|10, 10, 1324, 830|270||
|53|cut|s0/strip1/work/0/0|s0/strip1/work/0/0/0, s0/strip1/work/0/0/1|10, 10, 1324, 830|270|V {&quot;x&quot;:398,&quot;y&quot;:0} → {&quot;x&quot;:398,&quot;y&quot;:1324}|
|54|feed|s0/strip1/work/0/0/1||10, 413, 1324, 427|270||
|55|cut|s0/strip1/work/0/0/1|s0/strip1/work/0/0/1/0, s0/strip1/work/0/0/1/1|10, 413, 1324, 427|270|V {&quot;x&quot;:219,&quot;y&quot;:0} → {&quot;x&quot;:219,&quot;y&quot;:1324}|
|56|feed|s0/strip1/work/0/0/1/1||10, 637, 1324, 203|270||
|57|cut|s0/strip1/work/0/0/1/1|s0/strip1/work/0/0/1/1/0, s0/strip1/work/0/0/1/1/1|10, 637, 1324, 203|270|V {&quot;x&quot;:180,&quot;y&quot;:0} → {&quot;x&quot;:180,&quot;y&quot;:1324}|
|58|feed|s0/strip1/work/0/0/1/1/0||10, 637, 1324, 180|270||
|59|rotate|s0/strip1/work/0/0/1/1/0|s0/strip1/work/0/0/1/1/0|10, 637, 1324, 180|0||
|60|cut|s0/strip1/work/0/0/1/1/0|s0/strip1/work/0/0/1/1/0/0, s0/strip1/work/0/0/1/1/0/1|10, 637, 1324, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|61|feed|s0/strip1/work/0/0/1/1/0/1||253, 637, 1081, 180|0||
|62|cut|s0/strip1/work/0/0/1/1/0/1|s0/strip1/work/0/0/1/1/0/1/0, s0/strip1/work/0/0/1/1/0/1/1|253, 637, 1081, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|63|feed|s0/strip1/work/0/0/1/1/0/1/1||496, 637, 838, 180|0||
|64|cut|s0/strip1/work/0/0/1/1/0/1/1|s0/strip1/work/0/0/1/1/0/1/1/0, s0/strip1/work/0/0/1/1/0/1/1/1|496, 637, 838, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|65|feed|s0/strip1/work/0/0/1/1/0/1/1/1||739, 637, 595, 180|0||
|66|cut|s0/strip1/work/0/0/1/1/0/1/1/1|s0/strip1/work/0/0/1/1/0/1/1/1/0, s0/strip1/work/0/0/1/1/0/1/1/1/1|739, 637, 595, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|67|feed|s0/strip1/work/0/0/1/1/0/1/1/1/1||982, 637, 352, 180|0||
|68|cut|s0/strip1/work/0/0/1/1/0/1/1/1/1|s0/strip1/work/0/0/1/1/0/1/1/1/1/0, s0/strip1/work/0/0/1/1/0/1/1/1/1/1|982, 637, 352, 180|0|V {&quot;x&quot;:238,&quot;y&quot;:0} → {&quot;x&quot;:238,&quot;y&quot;:180}|
|69|feed|s0/strip2/work/1/1/1||1764, 1540, 966, 280|90||
|70|cut|s0/strip2/work/1/1/1|s0/strip2/work/1/1/1/1, s0/strip2/work/1/1/1/0|1764, 1540, 966, 280|90|V {&quot;x&quot;:5,&quot;y&quot;:0} → {&quot;x&quot;:5,&quot;y&quot;:966}|
|71|feed|s0/strip2/work/1/1/1/0||1764, 1540, 966, 270|90||
|72|rotate|s0/strip2/work/1/1/1/0|s0/strip2/work/1/1/1/0|1764, 1540, 966, 270|180||
|73|cut|s0/strip2/work/1/1/1/0|s0/strip2/work/1/1/1/0/1, s0/strip2/work/1/1/1/0/0|1764, 1540, 966, 270|180|V {&quot;x&quot;:541,&quot;y&quot;:0} → {&quot;x&quot;:541,&quot;y&quot;:270}|
|74|feed|s0/strip2/work/1/1/1/0/1||2189, 1540, 541, 270|180||
|75|cut|s0/strip2/work/1/1/1/0/1|s0/strip2/work/1/1/1/0/1/1, s0/strip2/work/1/1/1/0/1/0|2189, 1540, 541, 270|180|V {&quot;x&quot;:116,&quot;y&quot;:0} → {&quot;x&quot;:116,&quot;y&quot;:270}|
|76|feed|s0/strip1/work/0/0/1/0||10, 413, 1324, 219|270||
|77|rotate|s0/strip1/work/0/0/1/0|s0/strip1/work/0/0/1/0|10, 413, 1324, 219|0||
|78|cut|s0/strip1/work/0/0/1/0|s0/strip1/work/0/0/1/0/0, s0/strip1/work/0/0/1/0/1|10, 413, 1324, 219|0|V {&quot;x&quot;:1000,&quot;y&quot;:0} → {&quot;x&quot;:1000,&quot;y&quot;:219}|
|79|feed|s0/strip1/work/0/0/0||10, 10, 1324, 398|270||
|80|rotate|s0/strip1/work/0/0/0|s0/strip1/work/0/0/0|10, 10, 1324, 398|0||
|81|cut|s0/strip1/work/0/0/0|s0/strip1/work/0/0/0/0, s0/strip1/work/0/0/0/1|10, 10, 1324, 398|0|V {&quot;x&quot;:1132,&quot;y&quot;:0} → {&quot;x&quot;:1132,&quot;y&quot;:398}|
|82|feed|s0/strip1/work/1/1/1||10, 1550, 1749, 270|90||
|83|rotate|s0/strip1/work/1/1/1|s0/strip1/work/1/1/1|10, 1550, 1749, 270|180||
|84|cut|s0/strip1/work/1/1/1|s0/strip1/work/1/1/1/1, s0/strip1/work/1/1/1/0|10, 1550, 1749, 270|180|V {&quot;x&quot;:1324,&quot;y&quot;:0} → {&quot;x&quot;:1324,&quot;y&quot;:270}|
|85|feed|s0/strip1/work/1/1/0||10, 1248, 1749, 297|90||
|86|rotate|s0/strip1/work/1/1/0|s0/strip1/work/1/1/0|10, 1248, 1749, 297|180||
|87|cut|s0/strip1/work/1/1/0|s0/strip1/work/1/1/0/1, s0/strip1/work/1/1/0/0|10, 1248, 1749, 297|180|V {&quot;x&quot;:1447,&quot;y&quot;:0} → {&quot;x&quot;:1447,&quot;y&quot;:297}|
|88|feed|s0/strip1/work/1/1/0/1||312, 1248, 1447, 297|180||
|89|cut|s0/strip1/work/1/1/0/1|s0/strip1/work/1/1/0/1/1, s0/strip1/work/1/1/0/1/0|312, 1248, 1447, 297|180|V {&quot;x&quot;:1145,&quot;y&quot;:0} → {&quot;x&quot;:1145,&quot;y&quot;:297}|
|90|feed|s0/strip1/work/1/1/1/1||435, 1550, 1324, 270|180||
|91|cut|s0/strip1/work/1/1/1/1|s0/strip1/work/1/1/1/1/1, s0/strip1/work/1/1/1/1/0|435, 1550, 1324, 270|180|V {&quot;x&quot;:899,&quot;y&quot;:0} → {&quot;x&quot;:899,&quot;y&quot;:270}|
|92|feed|s0/strip1/work/1/1/0/1/1||614, 1248, 1145, 297|180||
|93|cut|s0/strip1/work/1/1/0/1/1|s0/strip1/work/1/1/0/1/1/1, s0/strip1/work/1/1/0/1/1/0|614, 1248, 1145, 297|180|V {&quot;x&quot;:843,&quot;y&quot;:0} → {&quot;x&quot;:843,&quot;y&quot;:297}|
|94|feed|s0/strip1/work/1/1/0/1/1/1||916, 1248, 843, 297|180||
|95|cut|s0/strip1/work/1/1/0/1/1/1|s0/strip1/work/1/1/0/1/1/1/1, s0/strip1/work/1/1/0/1/1/1/0|916, 1248, 843, 297|180|V {&quot;x&quot;:541,&quot;y&quot;:0} → {&quot;x&quot;:541,&quot;y&quot;:297}|
|96|feed|s0/strip1/work/1/1/1/1/1||860, 1550, 899, 270|180||
|97|cut|s0/strip1/work/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/0|860, 1550, 899, 270|180|V {&quot;x&quot;:474,&quot;y&quot;:0} → {&quot;x&quot;:474,&quot;y&quot;:270}|
|98|feed|s0/strip1/work/1/1/0/1/1/1/1||1218, 1248, 541, 297|180||
|99|cut|s0/strip1/work/1/1/0/1/1/1/1|s0/strip1/work/1/1/0/1/1/1/1/1, s0/strip1/work/1/1/0/1/1/1/1/0|1218, 1248, 541, 297|180|V {&quot;x&quot;:239,&quot;y&quot;:0} → {&quot;x&quot;:239,&quot;y&quot;:297}|
|100|feed|s0/strip1/work/1/1/1/1/1/1||1285, 1550, 474, 270|180||
|101|cut|s0/strip1/work/1/1/1/1/1/1|s0/strip1/work/1/1/1/1/1/1/1, s0/strip1/work/1/1/1/1/1/1/0|1285, 1550, 474, 270|180|V {&quot;x&quot;:49,&quot;y&quot;:0} → {&quot;x&quot;:49,&quot;y&quot;:270}|

## Per-detail rotation chains

|Part|Path turns|Strip level|ROTATE step numbers|
|---|---:|---:|---|
|7:1|4|5|11, 37, 52, 80|
|10:1|4|5|11, 37, 52, 77|
|4:1|4|5|11, 37, 52, 59|
|4:2|4|5|11, 37, 52, 59|
|4:3|4|5|11, 37, 52, 59|
|4:4|4|5|11, 37, 52, 59|
|4:5|4|5|11, 37, 52, 59|
|2:3|3|4|11, 37, 43|
|2:4|3|4|11, 37, 43|
|2:5|3|4|11, 37, 43|
|6:1|2|3|11, 29|
|2:2|4|5|11, 29, 32, 40|
|3:1|2|3|11, 86|
|3:2|2|3|11, 86|
|3:3|2|3|11, 86|
|3:4|2|3|11, 86|
|3:5|2|3|11, 86|
|1:3|2|3|11, 83|
|1:4|2|3|11, 83|
|1:5|2|3|11, 83|
|2:1|2|3|11, 83|
|5:1|1|2|14|
|8:1|1|2|14|
|9:1|1|2|14|
|1:1|2|3|14, 72|
|1:2|2|3|14, 72|
