export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDate(): string {
  return formatLocalDate(new Date());
}

/** The Saturday on or before the given date, at local midnight. */
export function getWeekStart(date: Date): Date {
  const daysSinceSaturday = (date.getDay() + 1) % 7; // getDay(): 0=Sun ... 6=Sat
  const saturday = new Date(date);
  saturday.setDate(date.getDate() - daysSinceSaturday);
  saturday.setHours(0, 0, 0, 0);
  return saturday;
}

/** Most recent Saturday (today, if today is Saturday) as YYYY-MM-DD, matching WeeklyGoal's Saturday-start convention. */
export function getCurrentWeekStartDate(): string {
  return formatLocalDate(getWeekStart(new Date()));
}

export function getDaysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatLocalDate(d);
}
