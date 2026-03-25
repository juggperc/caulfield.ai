/**
 * Generates a date/time context string for system prompts.
 * Uses UTC for consistency across server environments.
 */
export const getDateTimeContext = (): string => {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const year = now.getUTCFullYear();
  return `Current date/time: ${dateStr}, ${timeStr} UTC. Current year: ${year}.`;
};