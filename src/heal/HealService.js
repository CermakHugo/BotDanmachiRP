import * as HealRoute from "./HealRoute.js";

const HEAL_COOLDOWN_MS = 3_600_000; // 1h

export function getRemainingHealCooldownMs(character, cooldownMs = HEAL_COOLDOWN_MS) {
  const last = character?.lastHealAt ? new Date(character.lastHealAt).getTime() : null;
  if (!last) return 0;
  return (last + cooldownMs) - Date.now();
}

export async function healCharacterOncePerHour(userId) {
  const character = await HealRoute.getCharacterForDiscordUser(userId);
  if (!character) return { ok: false, reason: "no_character" };
  if (character.isDead) return { ok: false, reason: "dead", character };

  const remaining = getRemainingHealCooldownMs(character);
  if (remaining > 0) return { ok: false, reason: "cooldown", character, remainingMs: remaining };

  const before = Number(character.health ?? 0);
  character.health = Number(character.maxHealth ?? before);
  character.lastHealAt = new Date();
  await HealRoute.saveCharacter(character);

  return {
    ok: true,
    character,
    healed: Math.max(0, Number(character.health) - before),
  };
}

export default { getRemainingHealCooldownMs, healCharacterOncePerHour };

