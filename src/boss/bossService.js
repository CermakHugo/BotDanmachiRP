import * as BossRoute from "./bossRoute.js";

const BOSS_RESPAWN_MINUTES = 60;

function addMinutes(date, minutes) {
  const ms = Number(minutes) > 0 ? Number(minutes) * 60 * 1000 : 60 * 60 * 1000;
  return new Date(date.getTime() + ms);
}

export async function createBoss({
  bossId,
  name,
  description = null,
  floor = 0,
  level = 1,
  strength = 0,
  agility = 0,
  dexterity = 0,
  intelligence = 0,
  endurance = 0,
  image = null,
  spawnIntervalMinutes = 60,
  isActive = true,
} = {}) {
  if (!bossId) throw new Error("bossId requis.");
  if (!name) throw new Error("Nom du boss requis.");

  const exists = await BossRoute.findBossById(bossId).catch(() => null);
  if (exists) throw new Error("Un boss avec ce bossId existe deja.");

  const safeLevel = Math.max(1, Number(level) || 1);
  const safeStrength = Math.max(0, Number(strength) || 0);
  const safeAgility = Math.max(0, Number(agility) || 0);
  const safeDexterity = Math.max(0, Number(dexterity) || 0);
  const safeIntelligence = Math.max(0, Number(intelligence) || 0);
  const safeEndurance = Math.max(0, Number(endurance) || 0);
  const maxHealth = Math.max(1, safeEndurance * 10);

  const now = new Date();
  return BossRoute.createBoss({
    bossId,
    name,
    description,
    floor: Number.isFinite(Number(floor)) ? Number(floor) : 0,
    level: safeLevel,
    strength: safeStrength,
    agility: safeAgility,
    dexterity: safeDexterity,
    intelligence: safeIntelligence,
    endurance: safeEndurance,
    maxHealth,
    health: maxHealth,
    image,
    spawnIntervalMinutes: Number.isFinite(Number(spawnIntervalMinutes)) ? Number(spawnIntervalMinutes) : 60,
    isActive: Boolean(isActive),
    isSpawned: false,
    nextSpawnAt: now,
  });
}

export async function resolveBoss(query) {
  const q = (query || "").toString().trim();
  if (!q) throw new Error("Boss requis.");

  const byId = await BossRoute.findBossById(q).catch(() => null);
  if (byId) return byId;

  const hits = await BossRoute.searchBossesByName(q, 10).catch(() => []);
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) throw new Error("Boss introuvable.");

  const lines = hits.slice(0, 5).map((b) => `- ${b.bossId}: ${b.name}`);
  throw new Error(`Plusieurs boss trouves. Precise:\n${lines.join("\n")}`);
}

export async function markBossSpawned(boss, now = new Date()) {
  boss.isSpawned = true;
  boss.lastSpawnAt = now;
  await BossRoute.saveBoss(boss);
  return boss;
}

export async function markBossDefeated(boss, now = new Date()) {
  boss.isSpawned = false;
  boss.lastDefeatedAt = now;
  boss.nextSpawnAt = addMinutes(now, BOSS_RESPAWN_MINUTES);
  await BossRoute.saveBoss(boss);
  return boss;
}

export async function rollBossSpawns(now = new Date()) {
  const spawnable = await BossRoute.getSpawnableBosses(now);
  const spawned = [];
  const occupiedFloors = new Set(
    (await BossRoute.getAllSpawnedBosses().catch(() => []))
      .map((b) => Number(b.floor))
      .filter((f) => Number.isFinite(f))
  );

  for (const boss of spawnable) {
    const bossFloor = Number(boss.floor);
    if (Number.isFinite(bossFloor) && occupiedFloors.has(bossFloor)) {
      continue;
    }

    if (Number.isFinite(bossFloor)) {
      const occupiedInDb = await BossRoute.hasSpawnedBossOnFloor(bossFloor).catch(() => false);
      if (occupiedInDb) {
        occupiedFloors.add(bossFloor);
        continue;
      }
    }

    await markBossSpawned(boss, now);
    spawned.push(boss);
    if (Number.isFinite(bossFloor)) {
      occupiedFloors.add(bossFloor);
    }
  }
  return spawned;
}

export default {
  createBoss,
  resolveBoss,
  markBossSpawned,
  markBossDefeated,
  rollBossSpawns,
};
