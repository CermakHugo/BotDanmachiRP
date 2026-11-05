import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"
import { Character } from "../character/CharacterModel.js";

export const Group = sequelize.define("Group", {
  groupId: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: DataTypes.STRING,
  description: DataTypes.TEXT,
  leader: DataTypes.STRING,
  visibility: {
    type: DataTypes.ENUM("familia", "open", "closed"),
    defaultValue: "open",
  },
  expeditionFloor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  expeditionFightLocked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  expeditionTextChannelId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  expeditionVoiceChannelId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: "Group",
});

Group.hasMany(Character, {
  sourceKey: "groupId",
  foreignKey: {
    name: "groupId",
    allowNull: true,
  },
  // IMPORTANT: supprimer un groupe ne doit JAMAIS supprimer les personnages.
  // On detache simplement les membres (groupId = NULL).
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Character.belongsTo(Group, {
  foreignKey: {
    name: "groupId",
    allowNull: true,
  },
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Group.belongsTo(Character, {
  as: "Leader",
  foreignKey: "leader",
  targetKey: "characterId",
});

const queryInterface = sequelize.getQueryInterface();

async function ensureColumn(columnName, definition) {
  const table = await queryInterface.describeTable("Group");
  if (!table[columnName]) {
    await queryInterface.addColumn("Group", columnName, definition);
  }
}

await Group.sync();
await ensureColumn("expeditionFloor", { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 });
await ensureColumn("expeditionFightLocked", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
await ensureColumn("expeditionTextChannelId", { type: DataTypes.STRING, allowNull: true });
await ensureColumn("expeditionVoiceChannelId", { type: DataTypes.STRING, allowNull: true });

export default Group;
