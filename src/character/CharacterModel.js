import { DataTypes } from "sequelize";
import { sequelize } from "../../database/db.js";
import { Status } from "../status/StatusModel.js";
import { PendingStats } from "../pendingStats/PendingStatsModel.js";
import { Magic } from "../magic/MagicModel.js";
import {Capacity} from "../capacity/capacityModel.js"
import { Monster } from "../monster/MonsterModel.js";

export const Character = sequelize.define("Character", {
  characterId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: "characters_userId_unique",
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 10, max: 100 },
  },
  race: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  knowledgePoints:{
    type: DataTypes.INTEGER,
    defaultValue : 0,
  },
  knowledgeLevel:{
    type : DataTypes.INTEGER,
    defaultValue : 0,
  },
  origin: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: "Aucune"
  },
  familia: {
    type: DataTypes.STRING,
    defaultValue: "Aucune",
  },
  metier: {  // Nouveau champ pour le métier
    type: DataTypes.STRING,
    allowNull: true, // Permet de le laisser vide si aucun métier n'est encore choisi
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: { min: 1, max: 10 },
  },
  appearance: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  floor: {                    // Ajout du champ "floor"
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },

  health: { type: DataTypes.INTEGER, defaultValue: 100 },
  maxHealth: { type: DataTypes.INTEGER, defaultValue: 100 },
  stamina: { type: DataTypes.INTEGER, defaultValue: 50 },
  maxStamina: { type: DataTypes.INTEGER, defaultValue: 50 },
  mana: { type: DataTypes.INTEGER, defaultValue: 50 },
  maxMana: { type: DataTypes.INTEGER, defaultValue: 50 },
  
  isDead:{
    type:DataTypes.BOOLEAN,
    allowNull:false,
    defaultValue: false,
  },

}, {
  tableName: "Characters",
});

Character.hasMany(Status, {
    foreignKey: {
      name : 'characterId',
      type: DataTypes.STRING,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
);

Character.hasOne(PendingStats, {
    foreignKey: {
      name : 'characterId',
      type: DataTypes.STRING,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
);

Character.hasMany(Magic, {
    foreignKey: {
      name : 'characterId',
      type: DataTypes.STRING,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
);

Character.hasMany(Capacity, {
    foreignKey: {
      name : 'characterId',
      type: DataTypes.STRING,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
);

await Character.sync();

//console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(Character.build())));

export default Character
