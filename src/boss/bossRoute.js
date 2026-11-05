import { Op } from "sequelize";
import Boss from "./bossModel.js";

export async function createBoss(entry) {
  return Boss.create({
    bossId: entry.bossId,
    name: entry.name,
    description: entry.description ?? null,
    floor: entry.floor ?? 0,
    level: entry.level ?? 1,
    strength: entry.strength ?? 0,
    agility: entry.agility ?? 0,
    dexterity: entry.dexterity ?? 0,
    intelligence: entry.intelligence ?? 0,
    endurance: entry.endurance ?? 0,
    maxHealth: entry.maxHealth ?? 1,
    health: entry.health ?? (entry.maxHealth ?? 1),
    image: entry.image ?? null,
    spawnIntervalMinutes: entry.spawnIntervalMinutes ?? 60,
    isActive: entry.isActive ?? true,
    isSpawned: entry.isSpawned ?? false,
    lastSpawnAt: entry.lastSpawnAt ?? null,
    nextSpawnAt: entry.nextSpawnAt ?? null,
    lastDefeatedAt: entry.lastDefeatedAt ?? null,
  });
}

export async function saveBoss(boss) {
  return boss.save();
}

export async function findBossById(bossId) {
  return Boss.findOne({ where: { bossId } });
}

export async function findBossByName(name) {
  return Boss.findOne({ where: { name } });
}

export async function searchBossesByName(query, limit = 10) {
  const q = (query || "").toString().trim();
  if (!q) return Boss.findAll({ limit, order: [["name", "ASC"]] });
  return Boss.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${q}%` } },
        { bossId: { [Op.like]: `%${q}%` } },
      ],
    },
    limit,
    order: [["name", "ASC"]],
  });
}

export async function getSpawnableBosses(now = new Date()) {
  return Boss.findAll({
    where: {
      isActive: true,
      isSpawned: false,
      [Op.or]: [
        { nextSpawnAt: null },
        {
          nextSpawnAt: {
            [Op.lte]: now,
          },
        },
      ],
    },
  });
}

export async function getAllSpawnedBosses() {
  return Boss.findAll({
    where: {
      isActive: true,
      isSpawned: true,
    },
  });
}

export async function getSpawnedBossByFloor(floor) {
  const numFloor = Number(floor) || 0;
  return Boss.findOne({
    where: {
      isActive: true,
      isSpawned: true,
      floor: numFloor,
    },
    order: [["lastSpawnAt", "DESC"]],
  });
}

export async function hasSpawnedBossOnFloor(floor) {
  const numFloor = Number(floor) || 0;
  const found = await Boss.findOne({
    where: {
      isActive: true,
      isSpawned: true,
      floor: numFloor,
    },
    attributes: ["id"],
  });
  return Boolean(found);
}

export default {
  createBoss,
  saveBoss,
  findBossById,
  findBossByName,
  searchBossesByName,
  getSpawnableBosses,
  getAllSpawnedBosses,
  getSpawnedBossByFloor,
  hasSpawnedBossOnFloor,
};
