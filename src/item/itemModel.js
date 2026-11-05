import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

function defineSimpleItemModel(name, tableName, extraFields = {}) {
  return sequelize.define(
    name,
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: `${tableName}_name_unique`,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: "Aucune description.",
      },
      ...extraFields,
    },
    { tableName }
  );
}

export const Weapon = defineSimpleItemModel("Weapon", "weapons", {
  damage: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  durability: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
  dexterityMalus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "dexterity_malus" },
});

export const Armor = defineSimpleItemModel("Armor", "armor", {
  resistance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  durability: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
  agilityMalus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "agility_malus" },
});

export const Ressource = defineSimpleItemModel("Ressource", "ressources");
export const Consumable = defineSimpleItemModel("Consumable", "consumable");

async function ensureColumn(tableName, columnName, columnDef) {
  const queryInterface = sequelize.getQueryInterface();
  let tableDescription;
  try {
    tableDescription = await queryInterface.describeTable(tableName);
  } catch {
    return;
  }
  if (tableDescription[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, columnDef);
}

async function ensureItemTables() {
  await Weapon.sync();
  await Armor.sync();
  await Ressource.sync();
  await Consumable.sync();

  await ensureColumn("weapons", "damage", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn("armor", "resistance", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn("weapons", "durability", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
  });

  await ensureColumn("armor", "durability", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
  });

  await ensureColumn("weapons", "dexterity_malus", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn("armor", "agility_malus", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
}

await ensureItemTables();

export default { Weapon, Armor, Ressource, Consumable };
