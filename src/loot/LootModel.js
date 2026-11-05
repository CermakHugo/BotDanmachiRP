import { DataTypes } from "sequelize";
import { Monster } from "../monster/MonsterModel.js";
import Boss from "../boss/bossModel.js";
import { sequelize } from "../../database.js"

export const LootMonster = sequelize.define(
  "LootMonster",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    monsterId: { type: DataTypes.STRING, allowNull: true, field: "MonsterId" },
    monsterName: { type: DataTypes.STRING, allowNull: true },
    rewardType: { type: DataTypes.STRING, allowNull: false },
    dropChance: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    itemName: { type: DataTypes.STRING, allowNull: true },
    itemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    size: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    minQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    maxQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "lootMonsters",
  }
);

LootMonster.belongsTo(Monster, {
  foreignKey: "monsterId",
  targetKey: "monsterId",
  constraints: false,
});

export const LootBoss = sequelize.define(
  "LootBoss",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bossId: { type: DataTypes.STRING, allowNull: false, field: "BossId" },
    bossName: { type: DataTypes.STRING, allowNull: true },
    rewardType: { type: DataTypes.STRING, allowNull: false },
    dropChance: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    itemName: { type: DataTypes.STRING, allowNull: true },
    itemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    minQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    maxQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "lootBosses",
  }
);

LootBoss.belongsTo(Boss, {
  foreignKey: "bossId",
  targetKey: "bossId",
  constraints: false,
});

export const LootExploration = sequelize.define(
  "LootExploration",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    kind: {
      type: DataTypes.ENUM("drop", "log"),
      allowNull: false,
      defaultValue: "drop",
    },
    sessionId: { type: DataTypes.STRING, allowNull: true },
    rewardType: { type: DataTypes.STRING, allowNull: false },
    dropChance: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    itemName: { type: DataTypes.STRING, allowNull: true },
    itemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    minQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    maxQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    action: { type: DataTypes.STRING, allowNull: true },
    data: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "lootExploration",
  }
);

await LootMonster.sync();
await LootBoss.sync();
await LootExploration.sync();

export default { LootMonster, LootBoss, LootExploration };