const {DateTime} = require("luxon");

/**
 * Parse date string like "Today", "Tomorrow", "Monday", etc.
 * Returns the next occurrence of that day
 * @param {string} dateStr - Date string from user
 * @param {string} timezone - Timezone (default: 'America/New_York')
 * @return {DateTime} - Luxon DateTime for that date at midnight
 */
const parseDate = (dateStr, timezone = "America/New_York") => {
  const now = DateTime.now().setZone(timezone);
  const normalizedDate = dateStr.toLowerCase().trim();

  // Handle "Today"
  if (normalizedDate === "today") {
    return now.startOf("day");
  }

  // Handle "Tomorrow"
  if (normalizedDate === "tomorrow") {
    return now.plus({days: 1}).startOf("day");
  }

  // Handle day names
  const daysOfWeek = {
    "monday": 1,
    "tuesday": 2,
    "wednesday": 3,
    "thursday": 4,
    "friday": 5,
    "saturday": 6,
    "sunday": 7,
  };

  const targetDay = daysOfWeek[normalizedDate];

  if (!targetDay) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  // Calculate how many days until the next occurrence
  const currentDay = now.weekday; // 1-7 (Mon-Sun)
  let daysToAdd = targetDay - currentDay;

  // If it's today or already passed, go to next week
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  return now.plus({days: daysToAdd}).startOf("day");
};

/**
 * Parse time string like "10 AM", "2:30 PM", "3pm"
 * @param {string} timeStr - Time string from user
 * @return {Object} - { hour, minute } in 24-hour format
 */
const parseTime = (timeStr) => {
  const normalized = timeStr.toLowerCase().trim();

  // Extract AM/PM
  const isAM = normalized.includes("am") || normalized.includes("a.m.");
  const isPM = normalized.includes("pm") || normalized.includes("p.m.");

  if (!isAM && !isPM) {
    throw new Error(`Time must include AM or PM: ${timeStr}`);
  }

  // Remove AM/PM and spaces
  const timeOnly = normalized
      .replace(/am|pm|a\.m\.|p\.m\./gi, "")
      .trim();

  // Split on colon
  const parts = timeOnly.split(":");
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] ? parseInt(parts[1], 10) : 0;

  // Validate
  if (isNaN(hour) || hour < 1 || hour > 12) {
    throw new Error(`Invalid hour: ${timeStr}`);
  }
  if (isNaN(minute) || minute < 0 || minute > 59) {
    throw new Error(`Invalid minute: ${timeStr}`);
  }

  // Convert to 24-hour format
  if (isPM && hour !== 12) {
    hour += 12;
  } else if (isAM && hour === 12) {
    hour = 0;
  }

  return {hour, minute};
};

/**
 * Combine date and time strings into a Luxon DateTime
 * @param {string} dateStr - Date string (Today, Tomorrow, Monday, etc.)
 * @param {string} timeStr - Time string (10 AM, 2:30 PM, etc.)
 * @param {string} timezone - Timezone
 * @return {DateTime} - Complete Luxon DateTime
 */
const parseDateTime = (dateStr, timeStr, timezone = "America/New_York") => {
  const date = parseDate(dateStr, timezone);
  const {hour, minute} = parseTime(timeStr);

  return date.set({hour, minute, second: 0, millisecond: 0});
};

module.exports = {
  parseDate,
  parseTime,
  parseDateTime,
};
