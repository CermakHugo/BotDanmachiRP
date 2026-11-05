import { Inventory, InventoryItem } from "./inventoryModel.js";

function normalizeItemReference(reference = null) {
  if (!reference) return { itemType: null, refId: null };

  if (typeof reference === "string") {
    const typed = /^([a-z_]+):([a-zA-Z0-9_-]+)$/.exec(reference.trim().toLowerCase());
    if (!typed) return { itemType: null, refId: null };
    return { itemType: typed[1], refId: typed[2] };
  }

  if (typeof reference === "object") {
    const rawType =
      reference.itemType ??
      reference.item_type ??
      reference.itemCategory ??
      reference.category ??
      reference.type ??
      null;
    const rawRef =
      reference.refId ??
      reference.ref_id ??
      reference.itemId ??
      reference.id ??
      null;

    const itemType = rawType ? String(rawType).trim().toLowerCase() : null;
    const refId = rawRef !== null && rawRef !== undefined ? String(rawRef).trim() : null;
    return { itemType: itemType || null, refId: refId || null };
  }

  return { itemType: null, refId: null };
}

async function getInventory(characterId) {
  return Inventory.findOne({
    where: { characterId },
    include: [InventoryItem],
  });
}

async function ensureInventory(characterId) {
  let inventory = await Inventory.findOne({ where: { characterId } });
  if (!inventory) {
    inventory = await Inventory.create({ characterId, money: 0 });
  }
  return inventory;
}

async function addMoney(characterId, amount) {
  const inventory = await ensureInventory(characterId);
  inventory.money += amount;
  return inventory.save();
}

async function removeMoney(characterId, amount) {
  const inventory = await ensureInventory(characterId);
  if (inventory.money < amount) {
    throw new Error("Fonds insuffisants");
  }
  inventory.money -= amount;
  return inventory.save();
}

async function addItem(characterId, itemName, quantity = 1, reference = null) {
  const inventory = await ensureInventory(characterId);
  const { itemType, refId } = normalizeItemReference(reference);

  let item = await InventoryItem.findOne({
    where: { inventoryId: inventory.id, name: itemName, itemType, refId },
  });

  if (item) {
    item.quantity += quantity;
    await item.save();
  } else {
    item = await InventoryItem.create({
      inventoryId: inventory.id,
      name: itemName,
      quantity,
      itemType,
      refId,
    });
  }
  return item;
}

async function removeItem(characterId, itemName, quantity = 1) {
  const inventory = await ensureInventory(characterId);
  const item = await InventoryItem.findOne({
    where: { inventoryId: inventory.id, name: itemName },
  });
  if (!item || item.quantity < quantity) {
    throw new Error(`Quantite insuffisante de l'item: ${itemName}`);
  }
  item.quantity -= quantity;
  if (item.quantity === 0) {
    await item.destroy();
  } else {
    await item.save();
  }
  return item;
}

export { getInventory, ensureInventory, addMoney, removeMoney, addItem, removeItem };
