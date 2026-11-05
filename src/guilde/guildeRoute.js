import { sequelize } from "../../database.js"
import { Inventory, InventoryItem } from "../inventory/inventoryModel.js";

export async function withTransaction(callback) {
  return sequelize.transaction(callback);
}

export async function findOrCreateInventoryForUpdate(characterId, transaction) {
  let inventory = await Inventory.findOne({
    where: { characterId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!inventory) {
    await Inventory.create({ characterId, money: 0 }, { transaction });
    inventory = await Inventory.findOne({
      where: { characterId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  return inventory;
}

export async function findInventoryItemsForUpdate(inventoryId, transaction) {
  return InventoryItem.findAll({
    where: { inventoryId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

export async function deleteInventoryItemById(id, transaction) {
  return InventoryItem.destroy({
    where: { id },
    transaction,
  });
}

export async function saveInventory(inventory, transaction) {
  return inventory.save({ transaction });
}
