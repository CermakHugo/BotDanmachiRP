import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

export const ExplorationLog = sequelize.define(
  "ExplorationLog",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    floor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "explore",
    },
    monsterName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lootSummary: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    narration: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { tableName: "ExplorationLogs" }
);

export default ExplorationLog;

