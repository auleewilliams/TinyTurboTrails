| low-1 | 240–440 | 1020 | 200 | A | ground-0:60 | g002, g003 |
| low-2 | 360–560 | 960 | 200 | A | low-1:60, return-1020:60 | g004, g005 |
| star-1 | 60–230 | 960 | 170 | A | low-1:60 | g006, special-1 |
| fork | 170–620 | 900 | 450 | B | low-2:60, star-1:60, return-960:60 | g007, g008, g009, cp-fork, letter-r |
| fork-left-1 | 180–400 | 840 | 220 | A | fork:60 | g010, g011 |
| fork-right-1 | 470–640 | 840 | 170 | A | fork:60 | g012 |
| fork-left-2 | 260–470 | 780 | 210 | A | fork-left-1:60, fork-right-1:60, middle-left-catch-3:60 | g013, g014 |
| fork-right-2 | 420–620 | 780 | 200 | A | fork-right-1:60, return-840:60 | g014, g015 |
| shared | 360–540 | 720 | 180 | A | fork-left-2:60, fork-right-2:60, return-780:60 | g016, g017 |
| middle | 40–620 | 660 | 580 | B | shared:60, return-720:60, middle-left-catch:60 | g018, g019, g020, cp-middle |
| spring | 40–190 | 600 | 150 | A | middle:60 | g023, timber-spring-1 |
| approach-1 | 230–450 | 600 | 220 | A | middle:60 | g021, g022 |
| approach-2 | 320–560 | 540 | 240 | A | approach-1:60 | g025, g026 |
| spring-reward | 40–200 | 510 | 160 | A | spring-catch:30 | g024, special-2 |
| spring-catch | 130–280 | 540 | 150 | A | spring:60, approach-1:60 | — |
| approach-3 | 240–460 | 480 | 220 | A | approach-2:60, spring-catch:60 | g027, g028 |
| canopy | 180–620 | 420 | 440 | B | approach-3:60, return-480:60 | g029, g030, cp-canopy, letter-e1 |
| upper-1 | 330–550 | 360 | 220 | A | canopy:60 | g031 |
| star-3-catch | 40–250 | 360 | 210 | A | canopy:60 | — |
| upper-2 | 230–450 | 300 | 220 | A | upper-1:60, star-3-catch:60 | g032 |
| star-3 | 60–200 | 300 | 140 | A | star-3-catch:60 | special-3 |
| upper-3 | 350–530 | 240 | 180 | A | upper-2:60, return-300:60 | g033 |
| lookout | 250–590 | 180 | 340 | B | upper-3:60, return-240:60 | letter-e2, finish |
| return-240 | 570–740 | 240 | 170 | A | return-300:60, outer-catch-300:60 | — |
| return-300 | 520–660 | 300 | 140 | A | upper-1:60, return-360:60 | — |
| return-360 | 580–740 | 360 | 160 | A | canopy:60, outer-catch-420:60 | — |
| return-480 | 580–740 | 480 | 160 | A | return-540:60, outer-catch-540:60 | — |
| return-540 | 520–660 | 540 | 140 | A | return-600:60 | — |
| return-600 | 580–740 | 600 | 160 | A | middle:60, outer-catch-660:60 | — |
| return-720 | 580–740 | 720 | 160 | A | fork-right-2:60, return-780:60, outer-catch-780:60 | — |
| return-780 | 520–660 | 780 | 140 | A | fork-right-1:60, return-840:60 | g015 |
| return-840 | 580–740 | 840 | 160 | A | fork:60, outer-catch-900:60 | — |
| return-960 | 620–740 | 960 | 120 | A | return-1020:60, outer-catch-1020:60 | — |
| return-1020 | 520–660 | 1020 | 140 | A | ground-0:60 | — |
| outer-catch-300 | 700–820 | 300 | 120 | A | return-360:60 | — |
| outer-catch-420 | 700–820 | 420 | 120 | A | return-480:60 | — |
| outer-catch-540 | 700–820 | 540 | 120 | A | return-600:60 | — |
| outer-catch-660 | 700–820 | 660 | 120 | A | return-720:60 | — |
| outer-catch-780 | 700–820 | 780 | 120 | A | return-840:60 | — |
| outer-catch-900 | 700–820 | 900 | 120 | A | return-960:60 | — |
| outer-catch-1020 | 700–820 | 1020 | 120 | A | ground-0:60 | — |
| middle-left-catch | 40–290 | 720 | 250 | A | fork-left-2:60, middle-left-catch-2:60 | — |
| middle-left-catch-2 | 40–250 | 780 | 210 | A | fork-left-1:60, middle-left-catch-3:60 | — |
| middle-left-catch-3 | 40–250 | 840 | 210 | A | fork:60 | g010 |
