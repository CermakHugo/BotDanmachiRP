import * as itemRoute from "./itemRoute.js";

const ITEM_CATEGORIES = new Set(["weapon", "armor", "ressource", "consumable"]);

function normalizeIdentifier(identifier) {
  if (!identifier) return null;
  return identifier.toString().trim();
}

export async function createItem({
  name,
  description,
  category: rawCategory,
  damage = null,
  resistance = null,
  durability = null,
  dexterityMalus = null,
  agilityMalus = null,
} = {}) {
  const normalizedName = name?.trim();
  if (!normalizedName) {
    throw new Error("Le nom de l'objet est obligatoire.");
  }

  const category = rawCategory ? rawCategory.toString().trim().toLowerCase() : "ressource";
  if (!ITEM_CATEGORIES.has(category)) {
    throw new Error("Categorie invalide (weapon, armor, ressource, consumable).");
  }

  const existing = await itemRoute.findItemByName(normalizedName);
  if (existing?.length) {
    throw new Error("Un objet porte deja ce nom.");
  }

  const created = await itemRoute.createItem({
    category,
    name: normalizedName,
    description: description?.trim() || "Aucune description.",
    damage,
    resistance,
    durability,
    dexterityMalus,
    agilityMalus,
  });

  return { ...created.toJSON(), category, table: itemRoute.resolveItemModel(category)?.table };
}

export async function findItem(identifier) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) throw new Error("Nom ou identifiant requis.");

  const typed = /^([a-z]+):(\d+)$/.exec(normalized.toLowerCase());
  if (typed) {
    const category = typed[1];
    const id = Number(typed[2]);
    if (!ITEM_CATEGORIES.has(category)) {
      throw new Error("Categorie invalide (weapon, armor, ressource, consumable).");
    }
    const hit = (await itemRoute.findItemById(id)).find((itemHit) => itemHit.category === category);
    if (!hit) throw new Error("Objet introuvable.");
    const itemJson = hit.item.toJSON();
    return { ...itemJson, category: hit.category, table: hit.table };
  }

  const hitsById = await itemRoute.findItemById(normalized);
  const hitsByName = hitsById.length ? [] : await itemRoute.findItemByName(normalized);
  const hits = hitsById.length ? hitsById : hitsByName;

  if (!hits.length) {
    throw new Error("Objet introuvable.");
  }

  if (hits.length > 1) {
    throw new Error("Identifiant ambigu. Utilise le nom de l'objet.");
  }

  const hit = hits[0];
  const itemJson = hit.item.toJSON();
  return { ...itemJson, category: hit.category, table: hit.table };
}
