import { addItem, addMoney } from "../inventory/inventoryService.js";
import { createBossDrop, createExplorationDrop, createMonsterDrop, findBossDrops, findExplorationDrops, findMonsterDrops } from "./lootRoute.js";

const BASE_LOOT = [
  { type: "money", min: 20, max: 60, label: "valis" },
  {
    type: "item",
    name: "Cristal terne",
    quantity: 1,
    label: "un cristal terne",
    data: { rarity: "commun", type: "materiau" },
  },
  {
    type: "item",
    name: "Herbe aromatique",
    quantity: 1,
    label: "une herbe aromatique",
    data: { type: "consommable", heal: 5 },
  },
];

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

function floorMultiplier(floor) {
  const depth = clamp(Number(floor) || 0, 0, 25);
  return 1 + depth * 0.12;
}

function pickBaseLoot() {
  return BASE_LOOT[Math.floor(Math.random() * BASE_LOOT.length)];
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function rollBetween(min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.floor(Math.random() * (high - low + 1));
}

function normalizeShardSize(size) {
  const value = (size || "").toString().trim().toLowerCase();
  if (["petit", "moyen", "grand", "colossal"].includes(value)) return value;
  return null;
}

function formatItemNameWithSize(itemName, size) {
  const normalized = normalizeShardSize(size);
  if (!normalized || !itemName) return itemName;
  return `${itemName} (${normalized})`;
}

function normalizeMonsterNameForLoot(name) {
  return (name || "")
    .toString()
    .trim()
    .replace(/\s+\d+$/, "")
    .trim();
}

export function rollLoot({ floor = 0 } = {}) {
  const entry = pickBaseLoot();
  const mult = floorMultiplier(floor);

  if (entry.type === "money") {
    const base = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
    const amount = Math.max(1, Math.floor(base * mult));
    return { type: "money", amount, summary: `recoit ${amount} valis` };
  }

  const quantity = Math.max(1, Math.floor((entry.quantity || 1) * (mult >= 2.2 ? 2 : 1)));
  return {
    type: "item",
    name: entry.name,
    quantity,
    data: entry.data || null,
    summary: `trouve ${entry.label} (${quantity}x)`,
  };
}

export async function grantLootToCharacter(
  characterId,
  { floor = 0, source = null, sessionId = null, action = null, monsterId = null, monsterName = null } = {}
) {
  let reward = null;
  if (source === "exploration") {
    const drops = await findExplorationDrops({ action }).catch(() => []);
    const eligible = drops.filter((drop) => drop.rewardType === "item" && drop.itemName);
    if (eligible.length) {
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      const chance = clampNumber(pick.dropChance ?? 1, 0, 1);
      if (Math.random() < chance) {
        const minQty = clampNumber(pick.minQuantity ?? 1, 1, 9999);
        const maxQty = clampNumber(pick.maxQuantity ?? minQty, 1, 9999);
        const quantity = rollBetween(minQty, maxQty);
        reward = {
          type: "item",
          name: pick.itemName,
          quantity,
          data: pick.data || null,
          summary: `trouve ${pick.itemName} (${quantity}x)`,
        };
      }
    }
  }

  if (!reward) {
    reward = rollLoot({ floor });
  }

  if (reward.type === "money") {
    await addMoney(characterId, reward.amount);
  } else {
    await addItem(characterId, reward.name, reward.quantity, reward.data);
  }

  return reward;
}

export async function grantLootToMembers(
  memberIds,
  { floor = 0, source = null, sessionId = null, action = null, monsterId = null, monsterName = null } = {}
) {
  const results = [];
  for (const memberId of memberIds) {
    const reward = await grantLootToCharacter(memberId, { floor, source, sessionId, action, monsterId, monsterName });
    results.push({ memberId, summary: reward.summary, reward });
  }
  return results;
}

export function summarizeLootList(lootList = []) {
  let money = 0;
  const itemsMap = new Map();

  for (const loot of lootList) {
    if (!loot || !loot.type) continue;

    if (loot.type === "money") {
      money += Number(loot.amount) || 0;
      continue;
    }

    if (loot.type === "item") {
      const name = loot.name ?? "Objet inconnu";
      const qty = Number(loot.quantity) || 1;
      itemsMap.set(name, (itemsMap.get(name) || 0) + qty);
    }
  }

  return {
    money,
    items: [...itemsMap.entries()].map(([name, quantity]) => ({ name, quantity })),
  };
}

export async function distributeCombatLoot(participantIds, lootList) {
  const ids = Array.isArray(participantIds) ? participantIds.filter(Boolean) : [];
  if (!ids.length) return { perPlayer: [] };

  const ledger = new Map(ids.map((id) => [id, { money: 0, items: new Map() }]));
  const pickRandomId = () => ids[Math.floor(Math.random() * ids.length)];

  for (const loot of lootList || []) {
    if (!loot || !loot.type) continue;

    if (loot.type === "money") {
      let remaining = Math.max(0, Number(loot.amount) || 0);
      while (remaining > 0) {
        const receiver = pickRandomId();
        const chunk = Math.max(1, Math.floor(Math.random() * Math.min(remaining, 20)) + 1);
        ledger.get(receiver).money += Math.min(chunk, remaining);
        remaining -= chunk;
      }
      continue;
    }

    if (loot.type === "item" && loot.name) {
      let remaining = Math.max(1, Number(loot.quantity) || 1);
      while (remaining > 0) {
        const receiver = pickRandomId();
        const current = ledger.get(receiver).items.get(loot.name) || { quantity: 0, data: loot.data || null };
        current.quantity += 1;
        if (!current.data && loot.data) current.data = loot.data;
        ledger.get(receiver).items.set(loot.name, current);
        remaining -= 1;
      }
    }
  }

  for (const [characterId, rewards] of ledger.entries()) {
    if (rewards.money > 0) await addMoney(characterId, rewards.money);
    for (const [itemName, itemInfo] of rewards.items.entries()) {
      if (itemInfo.quantity > 0) {
        await addItem(characterId, itemName, itemInfo.quantity, itemInfo.data || null);
      }
    }
  }

  const perPlayer = ids.map((characterId) => {
    const rewards = ledger.get(characterId);
    return {
      characterId,
      lootSummary: {
        money: rewards.money,
        items: [...rewards.items.entries()].map(([name, info]) => ({
          name,
          quantity: info.quantity,
        })),
      },
    };
  });

  return { perPlayer };
}

export async function addMonsterLootDrop({ monsterId = null, monsterName, item, dropChance = 1, minQuantity = 1, maxQuantity = 1, shardSize = null } = {}) {
  if (!monsterName) throw new Error("Nom du monstre requis.");
  if (!item?.name) throw new Error("Item invalide.");

  const chance = clampNumber(dropChance, 0, 1);
  const minQty = clampNumber(minQuantity, 1, 9999);
  const maxQty = clampNumber(maxQuantity, minQty, 9999);
  const size = normalizeShardSize(shardSize);

  return createMonsterDrop({
    monsterId,
    monsterName,
    rewardType: "item",
    itemId: item.id ?? null,
    itemName: item.name,
    size,
    minQuantity: minQty,
    maxQuantity: maxQty,
    dropChance: chance,
    data: { itemId: item.id ?? null, itemCategory: item.category ?? null },
  });
}

export async function addBossLootDrop({ bossId = null, bossName, item, dropChance = 1, minQuantity = 1, maxQuantity = 1 } = {}) {
  if (!bossId && !bossName) throw new Error("Boss requis.");
  if (!item?.name) throw new Error("Item invalide.");

  const chance = clampNumber(dropChance, 0, 1);
  const minQty = clampNumber(minQuantity, 1, 9999);
  const maxQty = clampNumber(maxQuantity, minQty, 9999);

  return createBossDrop({
    bossId,
    bossName: bossName ?? null,
    rewardType: "item",
    itemId: item.id ?? null,
    itemName: item.name,
    minQuantity: minQty,
    maxQuantity: maxQty,
    dropChance: chance,
    data: { itemId: item.id ?? null, itemCategory: item.category ?? null },
  });
}

export async function addExplorationLootDrop({ action = null, item, dropChance = 1, minQuantity = 1, maxQuantity = 1 } = {}) {
  if (!item?.name) throw new Error("Item invalide.");

  const chance = clampNumber(dropChance, 0, 1);
  const minQty = clampNumber(minQuantity, 1, 9999);
  const maxQty = clampNumber(maxQuantity, minQty, 9999);

  return createExplorationDrop({
    action: action || null,
    rewardType: "item",
    itemId: item.id ?? null,
    itemName: item.name,
    minQuantity: minQty,
    maxQuantity: maxQty,
    dropChance: chance,
    data: { itemId: item.id ?? null, itemCategory: item.category ?? null },
  });
}

export async function generateMonsterLootList(monster) {
  const rawMonsterName = monster?.name || null;
  const monsterName = normalizeMonsterNameForLoot(rawMonsterName);

  let drops = [];
  if (monsterName) {
    drops = await findMonsterDrops({ monsterName }).catch(() => []);
  }
  if (drops.length) {
    const lootList = [];
    for (const drop of drops) {
      if (drop.rewardType !== "item" || !drop.itemName) continue;
      const chance = clampNumber(drop.dropChance ?? 1, 0, 1);
      if (Math.random() >= chance) continue;
      const minQty = clampNumber(drop.minQuantity ?? 1, 1, 9999);
      const maxQty = clampNumber(drop.maxQuantity ?? minQty, 1, 9999);
      const quantity = rollBetween(minQty, maxQty);

      const itemName = formatItemNameWithSize(drop.itemName, drop.size);
      lootList.push({
        type: "item",
        name: itemName,
        quantity,
        data: drop.data || null,
      });
    }
    if (lootList.length) return lootList;
  }

  if (!monster?.loot || !Array.isArray(monster.loot)) return [];
  const lootDropped = [];
  monster.loot.forEach((lootEntry) => {
    if (Math.random() < lootEntry.dropChance) {
      const item = lootEntry.items[Math.floor(Math.random() * lootEntry.items.length)];
      lootDropped.push({
        type: "item",
        name: item.name,
        quantity: 1,
        data: item,
      });
    }
  });
  return lootDropped;
}

export async function generateBossLootList(boss) {
  const bossId = boss?.bossId || boss?.id || null;
  const bossName = boss?.name || null;

  let drops = [];
  if (bossId) {
    drops = await findBossDrops({ bossId }).catch(() => []);
  }
  if (!drops.length && bossName) {
    drops = await findBossDrops({ bossName }).catch(() => []);
  }

  if (!drops.length) return [];

  const lootList = [];
  for (const drop of drops) {
    if (drop.rewardType !== "item" || !drop.itemName) continue;
    const chance = clampNumber(drop.dropChance ?? 1, 0, 1);
    if (Math.random() >= chance) continue;
    const minQty = clampNumber(drop.minQuantity ?? 1, 1, 9999);
    const maxQty = clampNumber(drop.maxQuantity ?? minQty, 1, 9999);
    const quantity = rollBetween(minQty, maxQty);
    lootList.push({
      type: "item",
      name: drop.itemName,
      quantity,
      data: drop.data || null,
    });
  }

  return lootList;
}

export default {
  rollLoot,
  grantLootToCharacter,
  grantLootToMembers,
  distributeCombatLoot,
  addMonsterLootDrop,
  addBossLootDrop,
  addExplorationLootDrop,
  generateMonsterLootList,
  generateBossLootList,
};
