import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

export const ShopListing = sequelize.define("ShopListing", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  sellerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sellerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  itemName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  itemData: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("active", "sold", "cancelled"),
    defaultValue: "active",
  },
  buyerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  buyerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  soldAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: "ShopListings",
});

export const NpcShopItem = sequelize.define("NpcShopItem", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  npcKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  itemData: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: "NpcShopItems",
});

await ShopListing.sync();
await NpcShopItem.sync();
