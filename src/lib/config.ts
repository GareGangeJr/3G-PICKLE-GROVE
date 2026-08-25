export const BOOKING_CONFIG = {
  slotMinutes: 60,
  openHour: 8,
  /** Standard day end: last regular slot starts at 10 PM → ends 11 PM. */
  closeHour: 23,
  /**
   * Staff late range after 10 PM: 11 PM, then overnight 12 AM–7 AM
   * (appended as next-calendar-day hours in generateDaySlots).
   */
  staffCloseHour: 24,
  bookAheadDays: 7,
  cancelUntilHours: 2,
  timezone: "Asia/Manila",
  /** First day the court is open for schedules (YYYY-MM-DD). */
  openingDate: "2026-08-28",
} as const;

export const BRAND_NAME = "3G's Pickle Grove";

export const COURT_NAME = "3G's Pickle Grove Court 1";

export const FACEBOOK_PAGE_URL =
  "https://www.facebook.com/people/3Gs-Pickle-Grove/61593178647928/";
