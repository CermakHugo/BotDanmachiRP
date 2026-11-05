import { Op } from "sequelize";
import { Armor, Consumable, Ressource, Weapon } from "./itemModel.js";

const TABLES = [
  { category: "weapon", table: "weapons", model: Weapon },
  { category: "armor", table: "armor", model: Armor },
  { category: "ressource", table: "ressources", model: Ressource },
  { category: "consumable", table: "consumable", model: Consumable },
];

export function resolveItemModel(category) {
  const found = TABLES.find((entry) => entry.category === category);
  if (!found) return null;
  return found;
}

export async function createItem({
  category,
  name,
  description,
  damage = null,
  resistance = null,
  durability = null,
  dexterityMalus = null,
  agilityMalus = null,
}) {
  const resolved = resolveItemModel(category);
  if (!resolved) throw new Error("Categorie invalide (weapon, armor, ressource, consumable).");

  const payload = { name, description };

  if (resolved.category === "weapon" && damage !== null) payload.damage = Number(damage) || 0;
  if (resolved.category === "armor" && resistance !== null) payload.resistance = Number(resistance) || 0;

  if ((resolved.category === "weapon" || resolved.category === "armor") && durability !== null) {
    payload.durability = Math.max(0, Number(durability) || 0);
  }

  if (resolved.category === "weapon" && dexterityMalus !== null) {
    payload.dexterityMalus = Math.max(0, Number(dexterityMalus) || 0);
  }

  if (resolved.category === "armor" && agilityMalus !== null) {
    payload.agilityMalus = Math.max(0, Number(agilityMalus) || 0);
  }

  return resolved.model.create(payload);
}

export async function findItemByName(name) {
  if (!name) return [];
  const normalized = name.toString().trim();
  if (!normalized) return [];

  const hits = [];
  for (const entry of TABLES) {
    const item = await entry.model.findOne({
      where: {
        [Op.or]: [{ name: normalized }, { name: { [Op.like]: normalized } }],
      },
    });
    if (item) hits.push({ item, category: entry.category, table: entry.table });
  }
  return hits;
}

export async function searchItems(query, limit = 25) {
  const q = (query || "").toString().trim();
  const pattern = q ? `%${q}%` : "%";

  const results = [];
  const perTableLimit = Math.max(5, Math.min(25, limit));

  for (const entry of TABLES) {
    const rows = await entry.model.findAll({
      where: {
        name: { [Op.like]: pattern },
      },
      limit: perTableLimit,
      order: [["name", "ASC"]],
    });

    for (const row of rows) {
      results.push({ item: row, category: entry.category, table: entry.table });
    }
  }

  return results.slice(0, limit);
}

export async function findItemById(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return [];

  const hits = [];
  for (const entry of TABLES) {
    const item = await entry.model.findByPk(numericId);
    if (item) hits.push({ item, category: entry.category, table: entry.table });
  }
  return hits;
}

export async function listWeapons(limit = 25) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 25));
  return Weapon.findAll({
    limit: safeLimit,
    order: [["name", "ASC"]],
  });
}

export async function listArmor(limit = 25) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 25));
  return Armor.findAll({
    limit: safeLimit,
    order: [["name", "ASC"]],
  });
}

export default {
  resolveItemModel,
  createItem,
  findItemByName,
  findItemById,
  searchItems,
  listWeapons,
  listArmor,
};
