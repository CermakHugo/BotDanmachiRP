import * as GuildeRoute from "./guildeRoute.js";

function normalizeText(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeSizeFilter(size) {
  const normalized = normalizeText(size);
  if (!normalized || normalized === "all" || normalized === "toutes") return "all";
  if (normalized === "petit") return "petit";
  if (normalized === "moyen") return "moyen";
  if (normalized === "grand") return "grand";
  if (normalized === "colossal") return "colossal";
  return "all";
}

function detectCrystalShardSize(itemName) {
  const text = normalizeText(itemName);
  if (/(colossal|geant|huge|giant|xl)/.test(text)) return "colossal";
  if (/(grand|large|gros|big)/.test(text)) return "grand";
  if (/(moyen|medium|normal)/.test(text)) return "moyen";
  if (/(petit|small|tiny)/.test(text)) return "petit";
  return "moyen";
}

function getUnitPriceBySize(size) {
  if (size === "petit") return 35;
  if (size === "moyen") return 80;
  if (size === "grand") return 170;
  if (size === "colossal") return 320;
  return 80;
}

function isCrystalShardItem(itemName) {
  const text = normalizeText(itemName);
  if (!text) return false;
  return /(crystal|cristal)\s*shard\b/.test(text);
}

function matchFilter(size, filter) {
  if (filter === "all") return true;
  return size === filter;
}

export async function exchangeCrystalShards(characterId, { size = "all" } = {}) {
  const filter = normalizeSizeFilter(size);

  return GuildeRoute.withTransaction(async (transaction) => {
    const inventory = await GuildeRoute.findOrCreateInventoryForUpdate(characterId, transaction);
    const inventoryItems = await GuildeRoute.findInventoryItemsForUpdate(inventory.id, transaction);

    const shardItems = inventoryItems
      .map((item) => ({ item, detectedSize: detectCrystalShardSize(item.name) }))
      .filter(({ item, detectedSize }) => isCrystalShardItem(item.name) && matchFilter(detectedSize, filter));

    if (!shardItems.length) {
      throw new Error("Aucun Crystal Shard correspondant dans ton inventaire.");
    }

    let totalValis = 0;
    let totalQuantity = 0;
    const details = [];

    for (const { item, detectedSize } of shardItems) {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      if (quantity <= 0) continue;

      const unitPrice = getUnitPriceBySize(detectedSize);
      const subtotal = unitPrice * quantity;

      totalValis += subtotal;
      totalQuantity += quantity;
      details.push({
        name: item.name,
        size: detectedSize,
        quantity,
        unitPrice,
        subtotal,
      });

      await GuildeRoute.deleteInventoryItemById(item.id, transaction);
    }

    if (totalQuantity <= 0) {
      throw new Error("Aucun Crystal Shard exploitable n'a ete trouve.");
    }

    inventory.money += totalValis;
    await GuildeRoute.saveInventory(inventory, transaction);

    return {
      totalValis,
      totalQuantity,
      details,
      filter,
    };
  });
}
