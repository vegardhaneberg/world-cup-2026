// VM 2026 tippedata — fiktive, men plausible gruppespillkamper og tabell.
// Disclaimer: kampoppsett er oppdiktet for prototypen.
(function () {
  // Lagtokens: farget "klistremerke"-disk + 3-bokstavskode + farger.
  const T = {
    BRA: { code: "BRA", name: "Brasil",      disc: "#F5C518", fg: "#13351f" },
    SRB: { code: "SRB", name: "Serbia",      disc: "#C6363C", fg: "#fdf3e7" },
    ENG: { code: "ENG", name: "England",     disc: "#1f3a8a", fg: "#fdf3e7" },
    USA: { code: "USA", name: "USA",         disc: "#2b4a8b", fg: "#fdf3e7" },
    MEX: { code: "MEX", name: "Mexico",      disc: "#1c6b3c", fg: "#fdf3e7" },
    CRO: { code: "CRO", name: "Kroatia",     disc: "#C6363C", fg: "#fdf3e7" },
    ARG: { code: "ARG", name: "Argentina",   disc: "#7fb6db", fg: "#13351f" },
    NGA: { code: "NGA", name: "Nigeria",     disc: "#1c6b3c", fg: "#fdf3e7" },
    NOR: { code: "NOR", name: "Norge",       disc: "#C6363C", fg: "#fdf3e7" },
    JPN: { code: "JPN", name: "Japan",       disc: "#23407a", fg: "#fdf3e7" },
    GHA: { code: "GHA", name: "Ghana",       disc: "#2f7d4f", fg: "#fdf3e7" },
    MAR: { code: "MAR", name: "Marokko",     disc: "#9b2b2b", fg: "#fdf3e7" },
    POR: { code: "POR", name: "Portugal",    disc: "#9b2b2b", fg: "#fdf3e7" },
    KOR: { code: "KOR", name: "Sør-Korea",   disc: "#324a9c", fg: "#fdf3e7" },
    NED: { code: "NED", name: "Nederland",   disc: "#E08A2B", fg: "#13351f" },
    SEN: { code: "SEN", name: "Senegal",     disc: "#2f7d4f", fg: "#fdf3e7" },
  };

  // Beregn poeng per utfall ut fra desimalodds (vanskelig = mer poeng).
  function pts(odds) {
    return Math.max(2, Math.min(9, Math.round(odds * 1.6)));
  }

  function match(id, time, city, stadium, group, h, a, oH, oU, oB) {
    return {
      id, time, city, stadium, group,
      home: T[h], away: T[a],
      odds: { H: oH, U: oU, B: oB },
      points: { H: pts(oH), U: pts(oU), B: pts(oB) },
    };
  }

  // Dagens kamper (matchdag 8 — gruppespill).
  const today = [
    match("m1", "18:00", "New York", "MetLife Stadium",   "C", "ENG", "SRB", 1.7, 3.8, 5.2),
    match("m2", "18:00", "Mexico City", "Estadio Azteca",  "A", "MEX", "CRO", 2.9, 3.2, 2.5),
    match("m3", "21:00", "Los Angeles", "SoFi Stadium",    "D", "ARG", "NGA", 1.4, 4.6, 7.5),
    match("m4", "21:00", "Toronto", "BMO Field",           "F", "NOR", "JPN", 2.6, 3.3, 2.7),
    match("m5", "00:00", "Dallas", "AT&T Stadium",         "G", "BRA", "MAR", 1.6, 4.0, 5.4),
    match("m6", "00:00", "Seattle", "Lumen Field",         "H", "POR", "KOR", 1.8, 3.6, 4.6),
  ];

  // Kommende dager (for "se alle kamper"-listen).
  const upcoming = [
    { day: "Matchdag 9 — i morgen", matches: [
      match("m7",  "18:00", "Atlanta", "Mercedes-Benz Stadium", "B", "USA", "GHA", 2.2, 3.3, 3.4),
      match("m8",  "21:00", "Houston", "NRG Stadium",           "E", "NED", "SEN", 1.9, 3.4, 4.2),
      match("m9",  "00:00", "Vancouver", "BC Place",            "C", "KOR", "USA", 3.5, 3.4, 2.1),
    ]},
    { day: "Matchdag 10 — fredag", matches: [
      match("m10", "18:00", "Kansas City", "Arrowhead Stadium", "D", "CRO", "BRA", 4.4, 3.6, 1.8),
      match("m11", "21:00", "Miami", "Hard Rock Stadium",       "A", "JPN", "ENG", 4.0, 3.5, 1.9),
    ]},
  ];

  // Tabell / leaderboard. "me: true" = innlogget bruker.
  const leaderboard = [
    { rank: 1,  name: "Panenka-Pål",      pts: 184, hit: 71, trend:  2 },
    { rank: 2,  name: "Tippetuva",        pts: 179, hit: 68, trend:  1 },
    { rank: 3,  name: "Offside-Odd",      pts: 171, hit: 66, trend: -1 },
    { rank: 4,  name: "Hjørnespark-Hege", pts: 168, hit: 64, trend:  3 },
    { rank: 5,  name: "Frispark-Frode",   pts: 162, hit: 63, trend: -2 },
    { rank: 6,  name: "Keeper-Kari",      pts: 159, hit: 61, trend:  0 },
    { rank: 7,  name: "Deg",              pts: 154, hit: 60, trend:  4, me: true },
    { rank: 8,  name: "Volley-Vetle",     pts: 151, hit: 59, trend: -3 },
    { rank: 9,  name: "Dribbler'n",       pts: 147, hit: 58, trend:  1 },
    { rank: 10, name: "Stang-Inn-Stian",  pts: 142, hit: 56, trend: -1 },
    { rank: 11, name: "Banan-Bente",      pts: 138, hit: 55, trend:  2 },
    { rank: 12, name: "Sisteskanse-Sara", pts: 133, hit: 53, trend: -2 },
  ];

  window.VMDATA = { teams: T, today, upcoming, leaderboard };
})();
