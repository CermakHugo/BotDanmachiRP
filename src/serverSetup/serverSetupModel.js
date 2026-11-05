import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

export const ServerChannel = sequelize.define(
  "ServerChannel",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    guildId: { type: DataTypes.STRING, allowNull: false },
    key: { type: DataTypes.STRING, allowNull: false },
    channelId: { type: DataTypes.STRING, allowNull: false },
    channelType: { type: DataTypes.ENUM("category", "text", "voice"), allowNull: false },
    parentKey: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "ServerChannels",
    indexes: [{ unique: true, fields: ["guildId", "key"], name: "serverchannels_guildId_key_unique" }],
  }
);

await ServerChannel.sync();

export const ServerRole = sequelize.define(
  "ServerRole",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    guildId: { type: DataTypes.STRING, allowNull: false },
    key: { type: DataTypes.STRING, allowNull: false },
    roleId: { type: DataTypes.STRING, allowNull: false },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "ServerRoles",
    indexes: [{ unique: true, fields: ["guildId", "key"], name: "serverroles_guildId_key_unique" }],
  }
);

await ServerRole.sync();

export default { ServerChannel, ServerRole };
