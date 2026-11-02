// Booking rules. Every time here is Rome time (Europe/Rome).
// Hours and notice to be confirmed by Nico.

export const TZ = 'Europe/Rome';

/** The three kinds of appointment. `calls` = how many separate calls one booking holds (Build = two). */
export const types = {
  call: { minutes: 30, calls: 1, name: { en: 'Free call', it: 'Call gratuita' } },
  session: { minutes: 60, calls: 1, name: { en: 'Session', it: 'Session' } },
  build: { minutes: 90, calls: 2, name: { en: 'Build', it: 'Build' } },
};

/** Bookable hours per weekday (0 = Sunday … 6 = Saturday), as [start, end] in "HH:MM". */
export const hours = {
  1: [['10:00', '13:00'], ['15:00', '19:00']],
  2: [['10:00', '13:00'], ['15:00', '19:00']],
  3: [['10:00', '13:00'], ['15:00', '19:00']],
  4: [['10:00', '13:00'], ['15:00', '19:00']],
  5: [['10:00', '13:00'], ['15:00', '19:00']],
};

/** Slots start every STEP minutes. */
export const STEP = 30;
/** Free time kept around every busy block, in minutes. */
export const BUFFER = 0;
/** Earliest bookable slot: this many hours from now. */
export const NOTICE_HOURS = 12;
/** Latest bookable day: this many days from today. */
export const HORIZON_DAYS = 30;
/** Share of the 30-minute blocks kept busy on purpose (always the same ones), so the diary looks
    as full as it is. 0 turns it off. Nico, 2/11: "more people see I'm busy, more they trust". */
export const HOLD_SHARE = 0.15;

export const host = {
  name: 'Nicola Ghizzo · Omnya Lab',
  email: process.env.BOOKING_HOST_EMAIL || 'info@omnyalab.com',
};
