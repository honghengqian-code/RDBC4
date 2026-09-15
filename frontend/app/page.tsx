import Landing from "@/components/Landing";
import { getJobs } from "@/lib/api";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let openCount = 0;

  try {
    const result = await getJobs({ status: "open" });
    openCount = result.count;
  } catch (error) {
    logger.error("Failed to load open-role count for the landing page", error);
  }

  return <Landing openCount={openCount} />;
}
