import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"
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

  lastDamageAt:{
    type:DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },

  lastHealAt:{
    type:DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  // Autres champs si nécessaire...
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

Character.belongsToMany(Monster, { through: "CharacterKnowledgeMonster" });
Monster.belongsToMany(Character, { through: "CharacterKnowledgeMonster" });

async function ensureUserIdColumnExists() {
  const queryInterface = sequelize.getQueryInterface();
  let tableDescription;

  try {
    tableDescription = await queryInterface.describeTable("Characters");
  } catch (error) {
    // Table inexistante (nouvelle base) : sync() la creera avec la bonne structure
    return;
  }

  if (tableDescription.userId) {
    return;
  }

  try {
    await queryInterface.addColumn("Characters", "userId", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    // Copier l'ID utilisateur depuis characterId pour les anciens enregistrements
    await sequelize.query(
      "UPDATE `Characters` SET `userId` = `characterId` WHERE `userId` IS NULL OR `userId` = ''"
    );

    await queryInterface.changeColumn("Characters", "userId", {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.addIndex("Characters", ["userId"], {
      unique: true,
      name: "characters_userId_unique",
    });
  } catch (error) {
    console.error("[CharacterModel] Impossible d'ajouter la colonne userId :", error);
  }
}

async function removeLegacyEquipmentColumns() {
  const queryInterface = sequelize.getQueryInterface();
  let tableDescription;

  try {
    tableDescription = await queryInterface.describeTable("Characters");
  } catch (error) {
    return;
  }

  try {
    if (tableDescription.equippedWeaponId) {
      await queryInterface.removeColumn("Characters", "equippedWeaponId");
    }

    if (tableDescription.equippedArmorId) {
      await queryInterface.removeColumn("Characters", "equippedArmorId");
    }

    if (tableDescription.startingWeapon) {
      await queryInterface.removeColumn("Characters", "startingWeapon");
    }

    if (tableDescription.startingArmor) {
      await queryInterface.removeColumn("Characters", "startingArmor");
    }

    if (tableDescription.heavyArmorAllowed) {
      await queryInterface.removeColumn("Characters", "heavyArmorAllowed");
    }
  } catch (error) {
    console.error("[CharacterModel] Impossible de supprimer les colonnes legacy d'equipement :", error);
  }
}

Character.beforeValidate((character) => {
  if (!character.characterId && character.userId) {
    character.characterId = character.userId;
  }
});

await ensureUserIdColumnExists();
await removeLegacyEquipmentColumns();
await Character.sync();


console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(Character.build())));

export default Character
