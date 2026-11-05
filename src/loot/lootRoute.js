import { Op } from "sequelize";
import { LootBoss, LootExploration, LootMonster } from "./LootModel.js";

export async function createMonsterDrop(entry) {
  return LootMonster.create({
    monsterName: entry.monsterName ?? null,
    rewardType: entry.rewardType ?? "item",
    itemId: entry.itemId ?? null,
    itemName: entry.itemName ?? null,
    size: entry.size ?? null,
    minQuantity: entry.minQuantity ?? 1,
    maxQuantity: entry.maxQuantity ?? entry.minQuantity ?? 1,
    dropChance: entry.dropChance ?? 1,
    enabled: entry.enabled ?? true,
  });
}

export async function createBossDrop(entry) {
  return LootBoss.create({
    bossName: entry.bossName ?? null,
    rewardType: entry.rewardType ?? "item",
    amount: entry.amount ?? null,
    itemId: entry.itemId ?? null,
    itemName: entry.itemName ?? null,
    quantity: entry.quantity ?? null,
    minQuantity: entry.minQuantity ?? 1,
    maxQuantity: entry.maxQuantity ?? entry.minQuantity ?? 1,
    dropChance: entry.dropChance ?? 1,
    enabled: entry.enabled ?? true,
  });
}

export async function createExplorationDrop(entry) {
  return LootExploration.create({
    kind: "drop",
    action: entry.action ?? null,
    rewardType: entry.rewardType ?? "item",
    itemId: entry.itemId ?? null,
    itemName: entry.itemName ?? null,
    minQuantity: entry.minQuantity ?? 1,
    maxQuantity: entry.maxQuantity ?? entry.minQuantity ?? 1,
    dropChance: entry.dropChance ?? 1,
    enabled: entry.enabled ?? true,
    data: entry.data ?? null,
  });
}

export async function findMonsterDrops({ monsterName } = {}) {
  const where = {
    enabled: true,
  };

  const name = (monsterName || "").toString().trim();
  if (name) where.monsterName = name;

  return LootMonster.findAll({ where });
}

export async function findExplorationDrops({ action } = {}) {
  const where = {
    kind: "drop",
    enabled: true,
  };
  if (action) {
    where[Op.or] = [{ action }, { action: null }];
  }
  return LootExploration.findAll({ where });
}

export async function findBossDrops({ bossName, bossId } = {}) {
  const where = {
    enabled: true,
  };
  if (bossName) where.bossName = bossName;
  if (!bossName && bossId) where.bossId = bossId;
  return LootBoss.findAll({ where });
}

export default {
  createMonsterDrop,
  createBossDrop,
  createExplorationDrop,
  findMonsterDrops,
  findBossDrops,
  findExplorationDrops,
};

