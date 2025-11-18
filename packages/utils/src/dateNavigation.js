import { DateTime } from 'luxon';

/**
 * Navigate to the next day
 * @param {string} currentDate - Current ISO date string (e.g., "2025-11-23")
 * @returns {object} { date: "2025-11-24", month: "November", year: 2025 }
 */
export const navigateNextDay = (currentDate) => {
    const dt = DateTime.fromISO(currentDate).plus({ days: 1 });
    return {
      date: dt.toISODate(),
      month: dt.monthLong,
      year: dt.year,
    };
  };
  
  /**
   * Navigate to the previous day
   * @param {string} currentDate - Current ISO date string (e.g., "2025-11-23")
   * @returns {object} { date: "2025-11-22", month: "November", year: 2025 }
   */
  export const navigatePreviousDay = (currentDate) => {
    const dt = DateTime.fromISO(currentDate).minus({ days: 1 });
    return {
      date: dt.toISODate(),
      month: dt.monthLong,
      year: dt.year,
    };
  };
  
  /**
   * Navigate to today (reset to current date)
   * @returns {object} { date: "2025-11-23", month: "November", year: 2025 }
   */
  export const navigateToday = () => {
    const dt = DateTime.local();
    return {
      date: dt.toISODate(),
      month: dt.monthLong,
      year: dt.year,
    };
  };
  
  /**
 * Navigate to next month (keeping the same day number if possible)
 * @param {string} currentDate - Current ISO date string (e.g., "2025-11-23")
 * @returns {object} { date: "2025-12-23", month: "December", year: 2025 }
 */
export const navigateNextMonth = (currentDate) => {
    const dt = DateTime.fromISO(currentDate);
    const dayOfMonth = dt.day;
    
    // Move to next month
    let nextMonth = dt.plus({ months: 1 });
    
    // Try to keep the same day number, but if it doesn't exist (e.g., Jan 31 -> Feb 31), use the last day of the month
    const daysInNextMonth = nextMonth.daysInMonth;
    if (dayOfMonth > daysInNextMonth) {
      nextMonth = nextMonth.set({ day: daysInNextMonth });
    } else {
      nextMonth = nextMonth.set({ day: dayOfMonth });
    }
    
    return {
      date: nextMonth.toISODate(),
      month: nextMonth.monthLong,
      year: nextMonth.year,
    };
  };
  
  /**
   * Navigate to previous month (keeping the same day number if possible)
   * @param {string} currentDate - Current ISO date string (e.g., "2025-11-23")
   * @returns {object} { date: "2025-10-23", month: "October", year: 2025 }
   */
  export const navigatePreviousMonth = (currentDate) => {
    const dt = DateTime.fromISO(currentDate);
    const dayOfMonth = dt.day;
    
    // Move to previous month
    let prevMonth = dt.minus({ months: 1 });
    
    // Try to keep the same day number
    const daysInPrevMonth = prevMonth.daysInMonth;
    if (dayOfMonth > daysInPrevMonth) {
      prevMonth = prevMonth.set({ day: daysInPrevMonth });
    } else {
      prevMonth = prevMonth.set({ day: dayOfMonth });
    }
    
    return {
      date: prevMonth.toISODate(),
      month: prevMonth.monthLong,
      year: prevMonth.year,
    };
  };