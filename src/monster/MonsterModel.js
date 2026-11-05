import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"
import { Status } from "../status/StatusModel.js"
import { Magic } from "../magic/MagicModel.js";
import { Capacity } from "../capacity/capacityModel.js"

export const Monster = sequelize.define("Monster", {
  monsterId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: "Aucune"
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: { min: 1, max: 10 },
  },
  appearance: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  floorMin: {                    // Ajout du champ "floor"
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },

  floorMax: {                    // Ajout du champ "floor"
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  health: { type: DataTypes.INTEGER, defaultValue: 100 },
  maxHealth: { type: DataTypes.INTEGER, defaultValue: 100 },
  mana: { type: DataTypes.INTEGER, defaultValue: 50 },
  maxMana: { type: DataTypes.INTEGER, defaultValue: 50 },
  // Autres champs si nécessaire...
}, {
  tableName: "Monsters",
});

Monster.hasMany(Status, {
    sourceKey : 'monsterId',
    foreignKey: {
      name : 'monsterId',
      type: DataTypes.STRING,
      allowNull : true,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
);

Monster.hasMany(Magic, {
  sourceKey : 'monsterId',
    foreignKey: {
      name : 'monsterId',
      type: DataTypes.STRING,
      allowNull : true,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
);

Monster.hasMany(Capacity, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
})

await Monster.sync();

// Permet d'obtenir l'ensemble des propriété de Character :

// console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(Monster.build())));

export default Monster
