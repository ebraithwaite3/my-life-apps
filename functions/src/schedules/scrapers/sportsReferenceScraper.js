const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer"); // Add this
const {
  transformScheduleToCalendarEvents,
} = require("../utils/scheduleTransform");

/**
 * Sports Reference Scraper
 * Scrapes data from Sports Reference family of sites
 */
class SportsReferenceScraper {
  /**
   * Constructor
   */
  constructor() {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1"
    };
  }

  /**
 * Fetch page with Puppeteer (for Cloudflare-protected sites)
 * @param {string} url - URL to fetch
 * @param {string} waitForSelector - Optional CSS selector to wait for
 * @return {Promise} Cheerio loaded HTML
 */
async fetchPageWithBrowser(url, waitForSelector = null) {
  console.log(`Using Puppeteer for: ${url}`);
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Navigate and wait for content
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for specific selector if provided
    if (waitForSelector) {
      console.log(`Waiting for selector: ${waitForSelector}`);
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }
    
    // Give it extra time for dynamic content
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const html = await page.content();
    await browser.close();
    
    return cheerio.load(html);
  } catch (error) {
    if (browser) await browser.close();
    console.error(`Error with Puppeteer for ${url}:`, error.message);
    throw error;
  }
}

/**
 * Generic method to fetch and parse a page
 * Routes to Puppeteer for protected domains, axios for others
 * @param {string} url - URL to fetch
 * @param {string} waitForSelector - Optional CSS selector to wait for (Puppeteer only)
 * @return {Promise} Cheerio loaded HTML
 */
async fetchPage(url, waitForSelector = null) {
  // Use Puppeteer for Cloudflare-protected domains
  const protectedDomains = ['sports-reference.com', 'fbref.com'];
  const needsPuppeteer = protectedDomains.some(domain => url.includes(domain));
  
  if (needsPuppeteer) {
    return await this.fetchPageWithBrowser(url, waitForSelector);
  }
  
  // Use axios for working domains (faster)
  try {
    console.log(`Using axios for: ${url}`);
    const response = await axios.get(url, { headers: this.headers });
    return cheerio.load(response.data);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}


  /**
   * Scrape NFL team schedule
   * @param {string} teamCode - Team abbreviation (e.g., 'pit')
   * @param {string} season - Season year (e.g., '2025')
   * @return {Promise<Object>} Schedule data
   */
  async scrapeNFLTeamSchedule(teamCode, season) {
    const url =
      "https://www.pro-football-reference.com/teams/" +
      `${teamCode.toLowerCase()}/${season}.htm`;
    const $ = await this.fetchPage(url);

    const games = [];

    // Find the games/schedule table (usually has id "games")
    $("#games tbody tr").each((index, element) => {
      const $row = $(element);

      // Skip header rows
      if ($row.hasClass("thead")) return;

      const week = $row.find('th[data-stat="week_num"]').text().trim();
      const dayOfWeek = $row
        .find('td[data-stat="game_day_of_week"]')
        .text()
        .trim();
      const gameDate = $row.find('td[data-stat="game_date"]').text().trim();

      // Try to find game time in various possible locations
      let gameTime = "";

      // Check all possible time-related data-stat values
      const possibleTimeStats = [
        "gametime",
        "game_time",
        "time",
        "start_time",
        "kickoff",
      ];

      for (const stat of possibleTimeStats) {
        const time = $row.find(`td[data-stat="${stat}"]`).text().trim();
        if (time) {
          gameTime = time;
          break;
        }
      }

      // If still no time, check adjacent cells
      if (!gameTime) {
        // Sometimes time is in an adjacent cell without a data-stat
        const allCells = $row.find("td").toArray();
        allCells.forEach((cell) => {
          const text = $(cell).text().trim();
          // Check if this looks like a time
          if (
            text.match(/\d{1,2}:\d{2}\s*(AM|PM|am|pm)?/) ||
            text.match(/^\d{1,2}:\d{2}$/)
          ) {
            gameTime = text;
          }
        });
      }

      const boxScoreLink = $row
        .find('td[data-stat="boxscore_word"] a')
        .attr("href");

      // Result: W/L or blank if not played yet
      const gameResult = $row.find('td[data-stat="game_result"]').text().trim();
      const overtime = $row.find('td[data-stat="overtime"]').text().trim();

      // Opponent (@ for away, blank for home)
      const gameLocation = $row
        .find('td[data-stat="game_location"]')
        .text()
        .trim();
      const opponent = $row.find('td[data-stat="opp"] a').text().trim();

      // Scores
      const teamPoints = $row.find('td[data-stat="pts_off"]').text().trim();
      const oppPoints = $row.find('td[data-stat="pts_def"]').text().trim();

      // Additional stats (might not be filled in for future games)
      const passYards = $row.find('td[data-stat="pass_yds"]').text().trim();
      const rushYards = $row.find('td[data-stat="rush_yds"]').text().trim();
      const totalYards = $row.find('td[data-stat="tot_yds"]').text().trim();
      const turnovers = $row.find('td[data-stat="turnovers"]').text().trim();

      // Determine game status
      let status = "Scheduled";
      if (gameResult) {
        status = overtime ? `Final/${overtime}` : "Final";
      }

      // Determine if home or away
      const isAway = gameLocation === "@";

      const game = {
        week: week,
        dayOfWeek: dayOfWeek,
        date: gameDate,
        time: gameTime,
        opponent: opponent,
        isAway: isAway,
        location: isAway ? "Away" : "Home",
        result: gameResult, // W, L, or empty
        overtime: overtime,
        teamPoints: teamPoints,
        oppPoints: oppPoints,
        status: status,
        boxScoreUrl: boxScoreLink
          ? `https://www.pro-football-reference.com${boxScoreLink}`
          : null,
        stats: {
          passYards: passYards,
          rushYards: rushYards,
          totalYards: totalYards,
          turnovers: turnovers,
        },
      };

      // Only add if we have a week number
      if (game.week && game.opponent) {
        games.push(game);
      }
    });

    // Try to get team name from page title
    const pageTitle =
      $('h1[itemprop="name"] span').text().trim() || $("title").text().trim();
    const teamName = pageTitle.split(" ").slice(0, -1).join(" ");

    // Calculate record if games have been played
    let wins = 0;
    let losses = 0;
    games.forEach((game) => {
      if (game.result === "W") wins++;
      if (game.result === "L") losses++;
    });

    return {
      teamCode: teamCode.toUpperCase(),
      teamName: teamName,
      season: season,
      record: `${wins}-${losses}`,
      totalGames: games.length,
      gamesPlayed: wins + losses,
      scrapedAt: new Date().toISOString(),
      games,
    };
  }

  async scrapeCFBTeamSchedule(team, season) {
    const url = `https://www.sports-reference.com/cfb/schools/${team}/${season}-schedule.html`;
    const $ = await this.fetchPage(url);

    const games = [];

    // Find the schedule table
    $("#schedule tbody tr").each((index, element) => {
      const $row = $(element);

      // Skip header rows
      if ($row.hasClass("thead")) return;

      // Try multiple selectors for game number
      let gameNum = $row.find('th[data-stat="game_num"]').text().trim();
      if (!gameNum) {
        gameNum = $row.find('th[data-stat="g"]').text().trim();
      }
      if (!gameNum) {
        gameNum = $row.find("th").first().text().trim(); // First th in row
      }

      console.log(`Found game ${gameNum}`); // Debug logging

      const gameDate = $row.find('td[data-stat="date_game"]').text().trim();
      const dayOfWeek = $row.find('td[data-stat="day_of_week"]').text().trim();

      let gameTime = $row.find('td[data-stat="time_game"]').text().trim();
      if (!gameTime) {
        gameTime = $row.find('td[data-stat="game_time"]').text().trim();
      }

      const gameLocation = $row
        .find('td[data-stat="game_location"]')
        .text()
        .trim();
      const opponent = $row.find('td[data-stat="opp_name"]').text().trim();

      const gameResult = $row.find('td[data-stat="game_result"]').text().trim();
      const teamPoints = $row.find('td[data-stat="pts"]').text().trim();
      const oppPoints = $row.find('td[data-stat="opp_pts"]').text().trim();

      let status = "Scheduled";
      if (gameResult) {
        status = "Final";
      }

      const isAway = gameLocation === "@";

      const game = {
        week: gameNum || (index + 1).toString(), // Fallback to index if no game number
        dayOfWeek: dayOfWeek,
        date: gameDate,
        time: gameTime || "TBD",
        opponent: opponent,
        isAway: isAway,
        location: isAway ? "Away" : "Home",
        result: gameResult,
        teamPoints: teamPoints,
        oppPoints: oppPoints,
        status: status,
      };

      // Only add if we have opponent
      if (game.opponent) {
        games.push(game);
      }
    });

    // Get team name
    const pageTitle =
      $('h1 span[itemprop="name"]').text().trim() || $("title").text().trim();
    const teamName = pageTitle.split(" ").slice(0, -2).join(" ");

    let wins = 0;
    let losses = 0;
    games.forEach((game) => {
      if (game.result === "W") wins++;
      if (game.result === "L") losses++;
    });

    return {
      teamCode: team.toUpperCase().replace(/-/g, ""),
      teamName: teamName || team,
      season: season,
      record: `${wins}-${losses}`,
      totalGames: games.length,
      gamesPlayed: wins + losses,
      scrapedAt: new Date().toISOString(),
      games,
    };
  }

  /**
   * Scrape NCAAB team schedule
   * @param {string} team - Team slug for URL (e.g., 'michigan-state')
   * @param {string} season - Season year (e.g., '2026' for 2025-26 season)
   * @return {Promise<Object>} Schedule data
   */
  async scrapeNCAABTeamSchedule(team, season) {
    const url = `https://www.sports-reference.com/cbb/schools/${team}/men/${season}-schedule.html`;
    const $ = await this.fetchPage(url);

    const games = [];

    // Find the schedule table
    $("#schedule tbody tr").each((index, element) => {
      const $row = $(element);

      // Skip header rows
      if ($row.hasClass("thead")) return;

      // Try multiple selectors for game number
      let gameNum = $row.find('th[data-stat="game_num"]').text().trim();
      if (!gameNum) {
        gameNum = $row.find('th[data-stat="g"]').text().trim();
      }
      if (!gameNum) {
        gameNum = $row.find("th").first().text().trim();
      }

      const gameDate = $row.find('td[data-stat="date_game"]').text().trim();
      const dayOfWeek = $row.find('td[data-stat="day_of_week"]').text().trim();

      // Basketball might have time in different location
      let gameTime = $row.find('td[data-stat="time_game"]').text().trim();
      if (!gameTime) {
        gameTime = $row.find('td[data-stat="game_time"]').text().trim();
      }

      // Opponent
      const gameLocation = $row
        .find('td[data-stat="game_location"]')
        .text()
        .trim();
      const opponent = $row.find('td[data-stat="opp_name"]').text().trim();

      // Results
      const gameResult = $row.find('td[data-stat="game_result"]').text().trim();
      const teamPoints = $row.find('td[data-stat="pts"]').text().trim();
      const oppPoints = $row.find('td[data-stat="opp_pts"]').text().trim();

      // Tournament info
      const tournament = $row.find('td[data-stat="notes"]').text().trim();

      let status = "Scheduled";
      if (gameResult) {
        status = "Final";
      }

      const isAway = gameLocation === "@";
      const isNeutral = gameLocation === "N"; // Neutral site games

      const game = {
        week: gameNum || (index + 1).toString(),
        dayOfWeek: dayOfWeek,
        date: gameDate,
        time: gameTime || "TBD",
        opponent: opponent,
        isAway: isAway,
        isNeutral: isNeutral,
        location: isNeutral ? "Neutral" : isAway ? "Away" : "Home",
        result: gameResult,
        teamPoints: teamPoints,
        oppPoints: oppPoints,
        status: status,
        tournament: tournament, // NCAA Tournament, Conference Tournament, etc.
      };

      // Only add if we have opponent
      if (game.opponent) {
        games.push(game);
      }
    });

    // Get team name
    const pageTitle =
      $('h1 span[itemprop="name"]').text().trim() || $("title").text().trim();
    const teamName = pageTitle.split(" Men's Basketball")[0].trim();

    let wins = 0;
    let losses = 0;
    games.forEach((game) => {
      if (game.result === "W") wins++;
      if (game.result === "L") losses++;
    });

    return {
      teamCode: team.toUpperCase().replace(/-/g, ""),
      teamName: teamName || team,
      season: season,
      record: `${wins}-${losses}`,
      totalGames: games.length,
      gamesPlayed: wins + losses,
      scrapedAt: new Date().toISOString(),
      games,
    };
  }

  /**
 * Scrape NBA team schedule
 * @param {string} teamCode - Team abbreviation (e.g., 'GSW')
 * @param {string} season - Season year (e.g., '2026' for 2025-26)
 * @return {Promise<Object>} Schedule data
 */
async scrapeNBATeamSchedule(teamCode, season) {
  const url = `https://www.basketball-reference.com/teams/${teamCode}/${season}_games.html`;
  const $ = await this.fetchPage(url);

  const games = [];

  // Find the games table (usually has id "games")
  $("#games tbody tr").each((index, element) => {
    const $row = $(element);

    // Skip header rows
    if ($row.hasClass("thead")) return;

    // Game number
    const gameNum = $row.find('th[data-stat="game_num"]').text().trim() ||
                    $row.find('th[data-stat="g"]').text().trim() ||
                    $row.find("th").first().text().trim();

    const gameDate = $row.find('td[data-stat="date_game"]').text().trim();
    
    // Time might be in different locations
    let gameTime = $row.find('td[data-stat="game_start_time"]').text().trim();
    if (!gameTime) {
      gameTime = $row.find('td[data-stat="time_game"]').text().trim();
    }
    if (!gameTime) {
      gameTime = $row.find('td[data-stat="start_time"]').text().trim();
    }

    // Check for @ symbol indicating away game
    const opponentCell = $row.find('td[data-stat="opp_name"]');
    const opponentText = opponentCell.text().trim();
    const isAway = opponentText.startsWith("@");
    const opponent = opponentText.replace(/^@\s*/, ""); // Remove @ if present

    // Results
    const gameResult = $row.find('td[data-stat="game_result"]').text().trim();
    const overtime = $row.find('td[data-stat="overtimes"]').text().trim();
    const teamPoints = $row.find('td[data-stat="pts"]').text().trim();
    const oppPoints = $row.find('td[data-stat="opp_pts"]').text().trim();

    // Notes (like In-Season Tournament)
    const notes = $row.find('td[data-stat="notes"]').text().trim();

    let status = "Scheduled";
    if (gameResult) {
      status = overtime ? `Final/${overtime}` : "Final";
    }

    const game = {
      week: gameNum,
      date: gameDate,
      time: gameTime || "TBD",
      opponent: opponent,
      isAway: isAway,
      location: isAway ? "Away" : "Home",
      result: gameResult, // W, L, or empty
      overtime: overtime,
      teamPoints: teamPoints,
      oppPoints: oppPoints,
      status: status,
      notes: notes, // Tournament games, etc.
    };

    // Only add if we have game number and opponent
    if (game.week && game.opponent) {
      games.push(game);
    }
  });

  // Get team name from page title
  const pageTitle = $('h1 span[itemprop="name"]').text().trim() || 
                    $("title").text().trim();
  const teamName = pageTitle.split(" ").slice(0, -1).join(" "); // Remove year

  // Calculate record
  let wins = 0;
  let losses = 0;
  games.forEach((game) => {
    if (game.result === "W") wins++;
    if (game.result === "L") losses++;
  });

  return {
    teamCode: teamCode.toUpperCase(),
    teamName: teamName || teamCode,
    season: season,
    record: `${wins}-${losses}`,
    totalGames: games.length,
    gamesPlayed: wins + losses,
    scrapedAt: new Date().toISOString(),
    games,
  };
}

  /**
   * Scrape EPL team schedule from FBRef
   * @param {string} teamId - Team ID from FBRef URL (e.g., '18bb7c10')
   * @param {string} teamName - Team name for display (e.g., 'Arsenal')
   * @param {string} season - Season (e.g., '2025-2026')
   * @return {Promise<Object>} Schedule data
   */
  async scrapeEPLTeamSchedule(teamId, teamName, season) {
    const url = `https://fbref.com/en/squads/${teamId}/${teamName}-Stats`;
    
    // Wait for the Scores & Fixtures table specifically
    const $ = await this.fetchPage(url, '#matchlogs_for');
    
    const games = [];
    let gameNum = 0;
  
    // Find the "Scores & Fixtures" table (should be loaded now)
    $("table").each((index, table) => {
      const $table = $(table);
      const tableId = $table.attr('id');
  
      // Look for the matchlogs_for table specifically
      if (tableId === 'matchlogs_for') {
        console.log("Found Scores & Fixtures table (matchlogs_for)");
  
        $table.find("tbody tr").each((idx, element) => {
          const $row = $(element);
  
          // Skip header rows
          if ($row.hasClass("thead")) return;
  
          gameNum++;
  
          const gameDate = $row.find('th[data-stat="date"]').text().trim();
          
          // Get time - the data-stat is now "start_time"
          const timeCell = $row.find('td[data-stat="start_time"]');
          let gameTime = "";
          
          // Extract the localtime from the span
          const localtimeSpan = timeCell.find('span.localtime');
          if (localtimeSpan.length > 0) {
            // Get text like "(11:30)" and remove parentheses
            const timeText = localtimeSpan.text().trim();
            gameTime = timeText.replace(/[()]/g, '');
          }
  
          const competition = $row.find('td[data-stat="comp"]').text().trim();
          const venue = $row.find('td[data-stat="venue"]').text().trim();
          const opponent = $row.find('td[data-stat="opponent"]').text().trim();
  
          // Results (for completed games)
          const result = $row.find('td[data-stat="result"]').text().trim();
          const goalsFor = $row.find('td[data-stat="goals_for"]').text().trim();
          const goalsAgainst = $row.find('td[data-stat="goals_against"]').text().trim();
  
          let status = "Scheduled";
          if (result) {
            status = "Final";
          }
  
          const isAway = venue === "Away";
  
          const game = {
            week: gameNum.toString(),
            date: gameDate,
            time: gameTime || "TBD",
            opponent: opponent,
            isAway: isAway,
            location: isAway ? "Away" : "Home",
            competition: competition,
            result: result,
            goalsFor: goalsFor,
            goalsAgainst: goalsAgainst,
            status: status,
          };
  
          // Only add if we have date and opponent
          if (game.date && game.opponent) {
            games.push(game);
          }
        });
      }
    });
  
    // Rest of your code stays the same...
    let wins = 0;
    let draws = 0;
    let losses = 0;
    games.forEach((game) => {
      if (game.result === "W") wins++;
      if (game.result === "D") draws++;
      if (game.result === "L") losses++;
    });
  
    return {
      teamCode: teamName.toUpperCase(),
      teamName: teamName,
      season: season,
      record: `${wins}-${draws}-${losses}`,
      totalGames: games.length,
      gamesPlayed: wins + draws + losses,
      scrapedAt: new Date().toISOString(),
      games,
    };
  }
}

/**
 * Main function to scrape and transform a sport's schedule
 * @param {string} sport - Sport type ('nfl', 'cfb', 'ncaab', etc.)
 * @param {object} config - Sport configuration from Firestore
 * @return {Promise<Array>} Array of calendar event objects
 */
async function scrapeAndTransformSchedule(sport, config) {
  const scraper = new SportsReferenceScraper();
  let scheduleData;

  // Route to appropriate scraper based on sport
  switch (sport.toLowerCase()) {
    case "nfl":
      scheduleData = await scraper.scrapeNFLTeamSchedule(
        config.team,
        config.season
      );
      break;

    case "cfb":
      scheduleData = await scraper.scrapeCFBTeamSchedule(
        config.team,
        config.season
      );
      break;

    case "ncaab":
      scheduleData = await scraper.scrapeNCAABTeamSchedule(
        config.team,
        config.season
      );
      break;

    case "nba":
      scheduleData = await scraper.scrapeNBATeamSchedule(
        config.team,
        config.season
      );
      break;

    case "epl":
      scheduleData = await scraper.scrapeEPLTeamSchedule(
        config.teamId,
        config.team,
        config.season
      );
      break;

    default:
      throw new Error(`Unknown sport: ${sport}`);
  }

  // Transform to calendar events
  const calendarEvents = transformScheduleToCalendarEvents(
    scheduleData,
    config.calendarId,
    sport.toUpperCase(),
    config.season,
    {
      gameDuration: config.gameDuration || 3,
    }
  );

  return calendarEvents;
}

module.exports = {
  SportsReferenceScraper,
  scrapeAndTransformSchedule,
};
