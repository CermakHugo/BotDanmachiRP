import { DataTypes } from "sequelize";
import { sequelize } from "../../database/db.js";

export const GuildMission = sequelize.define(
  "GuildMission",
  {
    missionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    messageId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    objectiveType: {
      type: DataTypes.ENUM("kill_monster", "bring_loot"),
      allowNull: false,
    },
    objectiveTarget: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    objectiveQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    requiredParticipants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    rewardType: {
      type: DataTypes.ENUM("none", "money", "item"),
      allowNull: false,
      defaultValue: "none",
    },
    rewardItem: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    rewardQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "guildMissions",
  }
);

export const GuildMissionParticipant = sequelize.define(
  "GuildMissionParticipant",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    missionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    characterId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "userId",
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    progressValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "guildMissionParticipants",
    indexes: [
      {
        unique: true,
        fields: ["missionId", "userId"],
      },
    ],
  }
);

GuildMission.hasMany(GuildMissionParticipant, {
  foreignKey: "missionId",
  sourceKey: "missionId",
  onDelete: "CASCADE",
});

GuildMissionParticipant.belongsTo(GuildMission, {
  foreignKey: "missionId",
  targetKey: "missionId",
  onDelete: "CASCADE",
});

await GuildMission.sync();
await GuildMissionParticipant.sync();

export default { GuildMission, GuildMissionParticipant };
