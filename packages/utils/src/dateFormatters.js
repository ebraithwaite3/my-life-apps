import { DateTime } from "luxon";

/**
 * Format date as "Tue, Nov 11"
 * @param {string|DateTime} date - ISO date string or Luxon DateTime
 * @returns {string} Formatted date like "Tue, Nov 11"
 */
export const formatShortDate = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toFormat("ccc, LLL d"); // "Tue, Nov 11"
};

/**
 * Format date as "November 2025"
 * @param {string|DateTime} date - ISO date string or Luxon DateTime
 * @returns {string} Formatted date like "November 2025"
 */
export const formatMonthYear = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toFormat("LLLL yyyy"); // "November 2025"
};

/**
 * Format date as "Tuesday, November 11, 2025"
 * @param {string|DateTime} date - ISO date string or Luxon DateTime
 * @returns {string} Formatted date like "Tuesday, November 11, 2025"
 */
export const formatFullDate = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toFormat("cccc, LLLL d, yyyy"); // "Tuesday, November 11, 2025"
};

/**
 * Format time as "3:30 PM" in LOCAL timezone
 * @param {string|DateTime} date - ISO datetime string or Luxon DateTime
 * @returns {string} Formatted time like "3:30 PM"
 */
export const formatTime = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toLocal().toFormat("h:mm a"); // ← Added .toLocal()
};

/**
 * Format datetime as "Tue, Nov 11 at 3:30 PM" in LOCAL timezone
 * @param {string|DateTime} date - ISO datetime string or Luxon DateTime
 * @returns {string} Formatted datetime like "Tue, Nov 11 at 3:30 PM"
 */
export const formatDateTime = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toLocal().toFormat("ccc, LLL d 'at' h:mm a"); // ← Added .toLocal()
};

/**
 * Format event start time as "9:30 PM" in LOCAL timezone
 * Handles UTC timestamps from Firebase and converts to user's timezone
 * @param {string|DateTime} date - ISO datetime string with timezone
 * @returns {string} Formatted time like "9:30 PM"
 */
export const formatEventTime = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toLocal().toFormat("h:mm a");
};

/**
 * Format event date and time as "Tue, Nov 14 at 9:30 PM" in LOCAL timezone
 * @param {string|DateTime} date - ISO datetime string with timezone
 * @returns {string} Formatted datetime
 */
export const formatEventDateTime = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toLocal().toFormat("ccc, LLL d 'at' h:mm a");
};

/**
 * Format date as "Nov 11"
 * @param {string|DateTime} date - ISO date string or Luxon DateTime
 * @returns {string} Formatted date like "Nov 11"
 */
export const formatMonthDay = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toFormat("LLL d"); // "Nov 11"
};

/**
 * Format date as "11/23/2025"
 * @param {string|DateTime} date - ISO date string or Luxon DateTime
 * @returns {string} Formatted date like "11/23/2025"
 */
export const formatNumericDate = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toFormat("M/d/yyyy"); // "11/23/2025"
};

/**
 * Format relative time like "2 hours ago", "in 3 days"
 * @param {string|DateTime} date - ISO datetime string or Luxon DateTime
 * @returns {string} Relative time like "2 hours ago"
 */
export const formatRelativeTime = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toRelative(); // "2 hours ago", "in 3 days"
};

/**
 * Format month to 3 letter abbreviation (e.g., "Nov")
 * @param {string|DateTime} date - ISO date string or Luxon DateTime
 * @returns {string} Formatted month like "Nov"
 */
export const formatMonthAbbreviation = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toFormat("LLL"); // "Nov"
};

/**
 * Format month and year to 3 letter month and year (e.g., "Nov 2025")
 * @param {string|DateTime} date - ISO date string or Luxon DateTime
 * @returns {string} Formatted month and year like "Nov 2025"
 */
export const formatMonthYearAbbreviation = (date) => {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : date;
  if (!dt.isValid) return "";
  return dt.toFormat("LLL yyyy"); // "Nov 2025"
};

/**
 * Parse a 24-hour time string (e.g., '06:30' or '23:00') and format it as 
 * 12-hour time (e.g., "6:30 AM" or "11:00 PM").
 * * NOTE: This function assumes the time string is in the format 'HH:mm'. 
 * It treats the time as being in the local timezone.
 * * @param {string} timeString - Time string in 'HH:mm' format (e.g., '06:30', '23:00')
 * @returns {string} Formatted time string like "6:30 AM"
 */
export const format24HourTimeString = (timeString) => {
  // Use fromFormat to explicitly parse the 'HH:mm' string.
  // We use a dummy date (1990-01-01) for the parsing to work, 
  // as Luxon's fromFormat requires some form of date context by default 
  // unless you set parsing options, but this is the simplest method.
  const dt = DateTime.fromFormat(timeString, "HH:mm");
  
  if (!dt.isValid) return "";
  
  // Return in 12-hour format "h:mm a"
  return dt.toFormat("h:mm a"); 
};
