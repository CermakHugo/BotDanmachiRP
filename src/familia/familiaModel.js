import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

export const Familia = sequelize.define(
  "Familia",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    announcementChannelId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    captainRoleId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    captainId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    captainAssignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "Familia",
  }
);

export const FamiliaElection = sequelize.define(
  "FamiliaElection",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    familiaId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "completed"),
      allowNull: false,
      defaultValue: "active",
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "renouvellement",
    },
    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    winnerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "FamiliaElection",
  }
);

export const FamiliaVote = sequelize.define(
  "FamiliaVote",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    electionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    voterId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    candidateId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "FamiliaVote",
  }
);

Familia.hasMany(FamiliaElection, {
  as: "elections",
  foreignKey: "familiaId",
  onDelete: "CASCADE",
});

FamiliaElection.belongsTo(Familia, {
  as: "familia",
  foreignKey: "familiaId",
});

FamiliaElection.hasMany(FamiliaVote, {
  as: "votes",
  foreignKey: "electionId",
  onDelete: "CASCADE",
});


FamiliaVote.belongsTo(FamiliaElection, {
  as: "election",
  foreignKey: "electionId",
});

async function ensureFamiliaColumns() {
  const queryInterface = sequelize.getQueryInterface();
  let tableDescription;

  try {
    tableDescription = await queryInterface.describeTable("Familia");
  } catch (error) {
    // Table inexistante : un simple sync creera la structure complete
    return;
  }

  const columns = {
    roleId: { type: DataTypes.STRING, allowNull: true },
    announcementChannelId: { type: DataTypes.STRING, allowNull: true },
    captainRoleId: { type: DataTypes.STRING, allowNull: true },
    captainId: { type: DataTypes.STRING, allowNull: true },
    captainAssignedAt: { type: DataTypes.DATE, allowNull: true },
  };

  for (const [column, definition] of Object.entries(columns)) {
    if (!tableDescription[column]) {
      await queryInterface.addColumn("Familia", column, definition);
    }
  }
}

await ensureFamiliaColumns();
await Familia.sync();
await FamiliaElection.sync();
await FamiliaVote.sync();

export default Familia;
