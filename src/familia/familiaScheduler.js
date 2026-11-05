import cron from "node-cron";
import { closeExpiredElections, syncFamiliasFromCharacters, triggerMonthlyElections } from "./familiaService.js";

let monthlyJob = null;
let closingJob = null;

export function initFamiliaScheduler(client) {
  if (monthlyJob || closingJob) return;

  // Vérifie chaque heure si une élection doit être clôturée.
  closingJob = cron.schedule("0 * * * *", async () => {
    try {
      await closeExpiredElections(client);
    } catch (error) {
      console.error("[familiaScheduler] fermeture des elections impossible", error);
    }
  });

  // Chaque 3 du mois à 09:00, synchronise les familias et démarre les élections de renouvellement.
  monthlyJob = cron.schedule("0 9 3 * *", async () => {
    try {
      await syncFamiliasFromCharacters(client);
      await triggerMonthlyElections(client);
    } catch (error) {
      console.error("[familiaScheduler] lancement election mensuelle impossible", error);
    }
  });
}
