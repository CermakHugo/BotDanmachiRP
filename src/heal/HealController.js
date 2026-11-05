import { groupSearches } from "../group/groupService.js";
import * as HealService from "./HealService.js";

const REVIVE_AFTER_MS = 3_600_000; // 1h (doit matcher le cron)

function formatRemainingMs(ms) {
  const safe = Math.max(0, Number(ms) || 0);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}min ${seconds}s`;
}

function isUserOnExpedition(userId) {
  return Object.values(groupSearches || {}).some((session) => {
    if (!session?.isFinalized) return false;
    return (session.members || []).some(
      (m) => (m.status === "leader" || m.status === "accepted") && m.id === userId
    );
  });
}

function getRemainingReviveMs(character) {
  const last = character?.lastDamageAt ? new Date(character.lastDamageAt).getTime() : null;
  if (!last) return REVIVE_AFTER_MS;
  return (last + REVIVE_AFTER_MS) - Date.now();
}

export async function heal(interaction) {
  const userId = interaction.user.id;
  if (isUserOnExpedition(userId)) {
    return { ok: false, message: "❌ Impossible d'utiliser /heal pendant une expedition." };
  }

  const result = await HealService.healCharacterOncePerHour(userId);
  if (!result.ok) {
    if (result.reason === "no_character") {
      return { ok: false, message: "❌ Tu n'as pas de personnage. Utilise `/creer_personnage`." };
    }
    if (result.reason === "dead") {
      const remaining = formatRemainingMs(getRemainingReviveMs(result.character));
      return { ok: false, message: `💀 Tu es KO. Tu pourras rejouer dans ${remaining}.` };
    }
    if (result.reason === "cooldown") {
      const remaining = formatRemainingMs(result.remainingMs);
      return { ok: false, message: `⏳ Tu as deja utilise /heal. Reessaie dans ${remaining}.` };
    }
    return { ok: false, message: "❌ Impossible de te soigner pour le moment." };
  }

  const character = result.character;
  return {
    ok: true,
    message: `✅ Soins appliques: **+${result.healed} HP** (${character.health}/${character.maxHealth}).`,
  };
}

export default { heal };

