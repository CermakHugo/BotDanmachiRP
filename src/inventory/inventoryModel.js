import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"
import Character from "../character/CharacterModel.js";

const Inventory = sequelize.define("Inventory", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  characterId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: "inventories_characterId_unique",
  },
  money: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
}, {
  tableName: "Inventories",
});

const InventoryItem = sequelize.define("InventoryItem", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  inventoryId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  itemType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: "item_type",
  },
  refId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: "ref_id",
  },
}, {
  tableName: "InventoryItems",
});

Inventory.belongsTo(Character, {
  foreignKey: "characterId",
  targetKey: "userId",
  onDelete: "CASCADE",
});
Character.hasOne(Inventory, {
  foreignKey: "characterId",
  sourceKey: "userId",
});

Inventory.hasMany(InventoryItem, {
  foreignKey: "inventoryId",
  onDelete: "CASCADE",
});
InventoryItem.belongsTo(Inventory, {
  foreignKey: "inventoryId",
});

await Inventory.sync();
await InventoryItem.sync();

async function ensureInventoryItemColumns() {
  const queryInterface = sequelize.getQueryInterface();
  let tableDescription;

  try {
    tableDescription = await queryInterface.describeTable("InventoryItems");
  } catch {
    return;
  }

  try {
    if (!tableDescription.item_type && !tableDescription.itemType) {
      await queryInterface.addColumn("InventoryItems", "item_type", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!tableDescription.ref_id && !tableDescription.refId) {
      await queryInterface.addColumn("InventoryItems", "ref_id", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (tableDescription.data) {
      await sequelize.query(`
        UPDATE InventoryItems
        SET item_type = COALESCE(
          item_type,
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.itemType')),
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.item_type')),
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.itemCategory')),
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.category')),
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.type'))
        )
        WHERE data IS NOT NULL
      `).catch(() => {});

      await sequelize.query(`
        UPDATE InventoryItems
        SET ref_id = COALESCE(
          ref_id,
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.refId')),
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.ref_id')),
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.itemId')),
          JSON_UNQUOTE(JSON_EXTRACT(data, '$.id'))
        )
        WHERE data IS NOT NULL
      `).catch(() => {});

      await queryInterface.removeColumn("InventoryItems", "data");
    }
  } catch (error) {
    console.error("[InventoryModel] Impossible de mettre a jour la table InventoryItems :", error);
  }
}

await ensureInventoryItemColumns();

export { Inventory, InventoryItem };
