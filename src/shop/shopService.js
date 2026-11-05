import { sequelize } from "../../database/db.js";
import { Inventory } from "../../database/inventory.js";
import { InventoryItem } from "../../database/inventoryItem.js";
import { ShopListing, NpcShopItem } from "./shopModel.js";
import npcVendors from "../../data/npcShops.js";
import { ensureInventory, addItem } from "../inventory/inventory.js";

const DEFAULT_LIMIT = 5;

async function listActiveListings(limit = DEFAULT_LIMIT) {
  return ShopListing.findAll({
    where: { status: "active" },
    order: [["createdAt", "DESC"]],
    limit,
  });
}

async function listSellerListings(sellerId) {
  return ShopListing.findAll({
    where: { sellerId },
    order: [["createdAt", "DESC"]],
    limit: 10,
  });
}

async function createListing({ sellerId, sellerName, itemName, quantity, price }) {
  const inventory = await ensureInventory(sellerId);
  const itemRecord = await InventoryItem.findOne({
    where: { inventoryId: inventory.id, name: itemName },
  });
  if (!itemRecord || itemRecord.quantity < quantity) {
    throw new Error("Tu n'as pas cet objet en quantite suffisante.");
  }
  const payload = {
    itemType: itemRecord.itemType ?? null,
    refId: itemRecord.refId ?? null,
  };

  return sequelize.transaction(async transaction => {
    itemRecord.quantity -= quantity;
    if (itemRecord.quantity <= 0) {
      await itemRecord.destroy({ transaction });
    } else {
      await itemRecord.save({ transaction });
    }

    const listing = await ShopListing.create({
      sellerId,
      sellerName,
      itemName,
      quantity,
      price,
      itemData: payload,
    }, { transaction });

    return listing;
  });
}

async function debitMoney(characterId, amount, transaction) {
  const inventory = await ensureInventory(characterId);
  if (inventory.money < amount) {
    throw new Error("Fonds insuffisants.");
  }
  inventory.money -= amount;
  await inventory.save({ transaction });
  return inventory;
}

async function creditMoney(characterId, amount, transaction) {
  const inventory = await ensureInventory(characterId);
  inventory.money += amount;
  await inventory.save({ transaction });
  return inventory;
}

async function buyListing(listingId, { buyerId, buyerName }) {
  return sequelize.transaction(async transaction => {
    const listing = await ShopListing.findByPk(listingId, { transaction });
    if (!listing || listing.status !== "active") {
      throw new Error("Cette annonce n'est plus disponible.");
    }
    if (listing.sellerId === buyerId) {
      throw new Error("Tu ne peux pas racheter ta propre marchandise.");
    }

    await debitMoney(buyerId, listing.price, transaction);
    await creditMoney(listing.sellerId, listing.price, transaction);

    await addItem(buyerId, listing.itemName, listing.quantity, listing.itemData);

    listing.status = "sold";
    listing.buyerId = buyerId;
    listing.buyerName = buyerName;
    listing.soldAt = new Date();
    await listing.save({ transaction });

    return listing;
  });
}

function getNpcVendor(key) {
  return npcVendors.find(v => v.key === key);
}

async function ensureNpcStock(npcKey) {
  const vendor = getNpcVendor(npcKey);
  if (!vendor) {
    throw new Error("Ce marchand n'existe pas.");
  }
  for (const item of vendor.items) {
    await NpcShopItem.findOrCreate({
      where: { npcKey, name: item.name },
      defaults: {
        description: item.description,
        price: item.price,
        stock: item.stock,
        itemData: item.data,
      },
    });
  }
  return vendor;
}

async function listNpcItems(npcKey) {
  await ensureNpcStock(npcKey);
  return NpcShopItem.findAll({ where: { npcKey } });
}

async function buyNpcItem(itemId, { npcKey, buyerId, buyerName }) {
  return sequelize.transaction(async transaction => {
    const vendor = await ensureNpcStock(npcKey);
    const item = await NpcShopItem.findOne({ where: { id: itemId, npcKey }, transaction, lock: transaction.LOCK.UPDATE });
    if (!item) {
      throw new Error("Article introuvable chez ce marchand.");
    }
    if (item.stock !== null && item.stock <= 0) {
      throw new Error("Il n'en reste plus en vitrine.");
    }

    await debitMoney(buyerId, item.price, transaction);
    await addItem(buyerId, item.name, 1, item.itemData);

    if (item.stock !== null) {
      item.stock -= 1;
      await item.save({ transaction });
    }

    return { vendor, item, buyerName };
  });
}

export {
  listActiveListings,
  listSellerListings,
  createListing,
  buyListing,
  listNpcItems,
  buyNpcItem,
  getNpcVendor,
};
