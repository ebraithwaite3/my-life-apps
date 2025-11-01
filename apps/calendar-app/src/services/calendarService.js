// services/calendarService.js
import { DateTime } from "luxon";
import { getDocument, createDocument, updateDocument, queryDocuments } from "./firestoreService";
import { syncCalendar } from "./calendarSyncService";
import * as Crypto from "expo-crypto";

const uuidv4 = () => Crypto.randomUUID();

// ===== CALENDAR DOCUMENT OPERATIONS =====

/**
 * Create a new calendar document
 */
export const createCalendarDocument = async (calendarData, userId) => {
  const calendarId = uuidv4();

  const calendarDoc = {
    calendarId,
    name: calendarData.name,
    source: {
      type: calendarData.type,
      calendarAddress: calendarData.calendarAddress,
      provider: calendarData.provider || calendarData.type,
    },
    color: calendarData.color,
    events: {},
    sync: {
      lastSyncedAt: null,
      syncStatus: "pending",
    },
    subscribingUsers: [userId],
    createdBy: userId,
    createdAt: DateTime.now().toISO(),
    updatedAt: DateTime.now().toISO(),
    isActive: true,
  };

  await createDocument("calendars", calendarId, calendarDoc);
  return calendarDoc;
};

/**
 * Add a user to an existing calendar's subscribers
 */
export const addUserToCalendar = async (calendarId, userId) => {
  const calendarDoc = await getDocument("calendars", calendarId);
  if (!calendarDoc) throw new Error("Calendar not found");

  const subscribingUsers = [...(calendarDoc.subscribingUsers || [])];
  if (!subscribingUsers.includes(userId)) {
    subscribingUsers.push(userId);
    
    await updateDocument("calendars", calendarId, {
      subscribingUsers,
      updatedAt: DateTime.now().toISO(),
    });
  }

  return { ...calendarDoc, subscribingUsers };
};

/**
 * Find existing calendar by calendarAddress
 */
export const findCalendarByAddress = async (calendarAddress) => {
  const calendars = await queryDocuments("calendars", "source.calendarAddress", "==", calendarAddress);
  return calendars.length > 0 ? calendars[0] : null;
};

// ===== USER CALENDAR OPERATIONS =====

/**
 * Add calendar to user's profile
 */
export const addCalendarToUser = async (userId, calendarData) => {
  // Check if calendar already exists
  const existingCalendar = await findCalendarByAddress(calendarData.calendarAddress);

  let calendarDoc;
  if (existingCalendar) {
    calendarDoc = await addUserToCalendar(existingCalendar.calendarId, userId);
  } else {
    calendarDoc = await createCalendarDocument(calendarData, userId);
  }

  // Return user calendar reference with consistent property names
  return {
    calendarId: calendarDoc.calendarId,
    name: calendarData.name,
    calendarAddress: calendarData.calendarAddress,  // Use consistent property name
    calendarType: calendarData.type,        // Use consistent property name  
    color: calendarData.color,
    description: calendarData.description || "",
    permissions: calendarData.permissions || "read",
    isOwner: calendarData.isOwner || false,
  };
};

/**
 * Remove calendar from user's profile
 */
export const removeCalendarFromUser = async (userId, calendarId) => {
  const userDoc = await getDocument("users", userId);
  if (!userDoc) throw new Error("User not found");

  const updatedCalendars = (userDoc.calendars || []).filter(
    cal => cal.calendarId !== calendarId
  );

  await updateDocument("users", userId, { calendars: updatedCalendars });
  return true;
};

/**
 * Check if user already has a calendar with this calendarAddress
 */
export const userHasCalendar = async (userId, calendarAddress) => {
  // Validate inputs
  if (!userId || typeof userId !== 'string') {
    throw new Error(`Invalid userId: expected string, got ${typeof userId}. Value: ${JSON.stringify(userId)}`);
  }
  if (!calendarAddress || typeof calendarAddress !== 'string') {
    throw new Error(`Invalid calendarAddress: expected string, got ${typeof calendarAddress}. Value: ${JSON.stringify(calendarAddress)}`);
  }

  const userDoc = await getDocument("users", userId);
  if (!userDoc) return false;

  const calendars = userDoc.calendars || [];
  // Check both possible property names for backward compatibility
  return calendars.some(cal => cal.calendarAddress === calendarAddress || cal.calendarAddress === calendarAddress);
};

// ===== CALENDAR SYNC OPERATIONS =====

/**
 * Sync a single calendar
 */
export const syncCalendarById = async (calendarId) => {
  console.log(`🔄 Syncing calendar: ${calendarId}`);
  
  const calendarDoc = await getDocument("calendars", calendarId);
  if (!calendarDoc) {
    throw new Error("Calendar not found");
  }

  return await syncCalendar(calendarDoc);
};

/**
 * Get sync status for a calendar
 */
export const getCalendarSyncStatus = async (calendarId) => {
  const calendarDoc = await getDocument("calendars", calendarId);
  return calendarDoc?.sync || { syncStatus: "unknown" };
};

// ===== VALIDATION =====

/**
 * Validate calendar data before import
 */
export const validateCalendarData = (calendarData) => {
  const required = ['name', 'calendarAddress', 'type'];
  const missing = required.filter(field => !calendarData[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validate URL format
  if (!calendarData.calendarAddress.match(/^https?:\/\//) && !calendarData.calendarAddress.match(/^webcal:\/\//)) {
    throw new Error('Calendar calendarAddress must be a valid HTTP or webcal URL');
  }

  return true;
};

/**
 * Validate that user doesn't already have this calendar
 */
export const validateUniqueCalendar = async (userId, calendarAddress) => {
  console.log('Validating unique calendar:', { userId: typeof userId, calendarAddress: typeof calendarAddress });
  console.log('Values:', { userId, calendarAddress });
  
  const hasCalendar = await userHasCalendar(userId, calendarAddress);
  if (hasCalendar) {
    throw new Error("Calendar already exists in your account");
  }
  return true;
};