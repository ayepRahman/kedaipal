import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
	"purge expired slug history",
	{ hourUTC: 3, minuteUTC: 17 },
	internal.retailers.internalPurgeExpiredSlugHistory,
);

export default crons;
