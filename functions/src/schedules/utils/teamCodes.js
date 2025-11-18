/**
 * Team name to abbreviation mappings for various sports
 */

const NFL_TEAMS = {
  // AFC East
  "Buffalo Bills": "BUF",
  "Miami Dolphins": "MIA",
  "New England Patriots": "NE",
  "New York Jets": "NYJ",

  // AFC North
  "Baltimore Ravens": "BAL",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Pittsburgh Steelers": "PIT",

  // AFC South
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Tennessee Titans": "TEN",

  // AFC West
  "Denver Broncos": "DEN",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV",
  "Los Angeles Chargers": "LAC",

  // NFC East
  "Dallas Cowboys": "DAL",
  "New York Giants": "NYG",
  "Philadelphia Eagles": "PHI",
  "Washington Commanders": "WAS",

  // NFC North
  "Chicago Bears": "CHI",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Minnesota Vikings": "MIN",

  // NFC South
  "Atlanta Falcons": "ATL",
  "Carolina Panthers": "CAR",
  "New Orleans Saints": "NO",
  "Tampa Bay Buccaneers": "TB",

  // NFC West
  "Arizona Cardinals": "ARI",
  "Los Angeles Rams": "LAR",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
};

const NBA_TEAMS = {
  // Eastern Conference - Atlantic
  "Boston Celtics": "BOS",
  "Brooklyn Nets": "BKN",
  "New York Knicks": "NYK",
  "Philadelphia 76ers": "PHI",
  "Toronto Raptors": "TOR",

  // Eastern Conference - Central
  "Chicago Bulls": "CHI",
  "Cleveland Cavaliers": "CLE",
  "Detroit Pistons": "DET",
  "Indiana Pacers": "IND",
  "Milwaukee Bucks": "MIL",

  // Eastern Conference - Southeast
  "Atlanta Hawks": "ATL",
  "Charlotte Hornets": "CHA",
  "Miami Heat": "MIA",
  "Orlando Magic": "ORL",
  "Washington Wizards": "WAS",

  // Western Conference - Northwest
  "Denver Nuggets": "DEN",
  "Minnesota Timberwolves": "MIN",
  "Oklahoma City Thunder": "OKC",
  "Portland Trail Blazers": "POR",
  "Utah Jazz": "UTA",

  // Western Conference - Pacific
  "Golden State Warriors": "GSW",
  "Los Angeles Clippers": "LAC",
  "Los Angeles Lakers": "LAL",
  "Phoenix Suns": "PHX",
  "Sacramento Kings": "SAC",

  // Western Conference - Southwest
  "Dallas Mavericks": "DAL",
  "Houston Rockets": "HOU",
  "Memphis Grizzlies": "MEM",
  "New Orleans Pelicans": "NOP",
  "San Antonio Spurs": "SAS",
};

const EPL_TEAMS = {
  "Arsenal": "ARS",
  "Aston Villa": "AVL",
  "Bournemouth": "BOU",
  "Brentford": "BRE",
  "Brighton": "BHA",
  "Brighton & Hove Albion": "BHA",
  "Chelsea": "CHE",
  "Crystal Palace": "CRY",
  "Everton": "EVE",
  "Fulham": "FUL",
  "Ipswich Town": "IPS",
  "Leicester City": "LEI",
  "Liverpool": "LIV",
  "Manchester City": "MCI",
  "Manchester United": "MUN",
  "Newcastle United": "NEW",
  "Nottingham Forest": "NFO",
  "Southampton": "SOU",
  "Tottenham": "TOT",
  "Tottenham Hotspur": "TOT",
  "West Ham": "WHU",
  "West Ham United": "WHU",
  "Wolverhampton": "WOL",
  "Wolves": "WOL",
};

// CFB teams - Major teams (add more as needed)
const CFB_TEAMS = {
  "Alabama": "ALA",
  "Auburn": "AUB",
  "Clemson": "CLEM",
  "Florida": "FLA",
  "Florida State": "FSU",
  "Georgia": "UGA",
  "LSU": "LSU",
  "Michigan": "MICH",
  "Notre Dame": "ND",
  "Ohio State": "OSU",
  "Oklahoma": "OU",
  "Oregon": "ORE",
  "Penn State": "PSU",
  "Southern California": "USC",
  "Texas": "TEX",
  "Texas A&M": "TAMU",
  "UCLA": "UCLA",
  "Washington": "WASH",
};

// NCAAB teams - Major teams (add more as needed)
const NCAAB_TEAMS = {
  "Duke": "DUKE",
  "North Carolina": "UNC",
  "Kansas": "KU",
  "Kentucky": "UK",
  "Villanova": "NOVA",
  "Gonzaga": "GONZ",
  "Michigan State": "MSU",
  "Arizona": "ARIZ",
  "UCLA": "UCLA",
  "Louisville": "LOU",
  "Syracuse": "SYR",
  "Indiana": "IU",
  "Michigan": "MICH",
  "Wisconsin": "WISC",
  "Florida": "FLA",
  "Connecticut": "UCONN",
  "Maryland": "MD",
  "Illinois": "ILL",
  "Purdue": "PUR",
  "Virginia": "UVA",
};

/**
   * Get team code for a given team name and sport
   * @param {string} teamName - Full team name
   * @param {string} sport - Sport type (NFL, NBA, EPL, CFB, NCAAB)
   * @return {string} Team abbreviation or original name if not found
   */
function getTeamCode(teamName, sport) {
  if (!teamName) return "";

  let teamMap;

  switch (sport.toUpperCase()) {
    case "NFL":
      teamMap = NFL_TEAMS;
      break;
    case "NBA":
      teamMap = NBA_TEAMS;
      break;
    case "EPL":
      teamMap = EPL_TEAMS;
      break;
    case "CFB":
      teamMap = CFB_TEAMS;
      break;
    case "NCAAB":
      teamMap = NCAAB_TEAMS;
      break;
    default:
      return teamName;
  }

  return teamMap[teamName] || teamName;
}

/**
   * Add a custom team code mapping
   * @param {string} sport - Sport type
   * @param {string} teamName - Full team name
   * @param {string} teamCode - Abbreviation
   */
function addTeamCode(sport, teamName, teamCode) {
  switch (sport.toUpperCase()) {
    case "NFL":
      NFL_TEAMS[teamName] = teamCode;
      break;
    case "NBA":
      NBA_TEAMS[teamName] = teamCode;
      break;
    case "EPL":
      EPL_TEAMS[teamName] = teamCode;
      break;
    case "CFB":
      CFB_TEAMS[teamName] = teamCode;
      break;
    case "NCAAB":
      NCAAB_TEAMS[teamName] = teamCode;
      break;
  }
}

module.exports = {
  NFL_TEAMS,
  NBA_TEAMS,
  EPL_TEAMS,
  CFB_TEAMS,
  NCAAB_TEAMS,
  getTeamCode,
  addTeamCode,
};
