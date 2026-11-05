import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

export const Boss = sequelize.define(
  "Boss",
  {
    bossId: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    floor: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    strength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    agility: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    dexterity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    intelligence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    endurance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    maxHealth: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: "maxHealth" },
    health: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    image: { type: DataTypes.TEXT, allowNull: true },
    spawnIntervalMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isSpawned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastSpawnAt: { type: DataTypes.DATE, allowNull: true },
    nextSpawnAt: { type: DataTypes.DATE, allowNull: true },
    lastDefeatedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "bosses",
  }
);

export default Boss;