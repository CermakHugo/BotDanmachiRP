import cron from "node-cron";
import { rollBossSpawns } from "./bossService.js";

let bossSpawnJob = null;

export function initBossScheduler() {
  if (bossSpawnJob) return;

  bossSpawnJob = cron.schedule("* * * * *", async () => {
    try {
      await rollBossSpawns();
    } catch (error) {
      console.error("[bossScheduler] impossible de verifier les spawns boss", error);
    }
  });
}

export default { initBossScheduler };
