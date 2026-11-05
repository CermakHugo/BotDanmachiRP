import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

export const Equipement = sequelize.define(
  "Equipement",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    characterId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "equipement_character_unique",
    },
    armor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rightHand: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "right_hand",
    },
    leftHand: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "left_hand",
    },
    accessory1: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "accessory_1",
    },
    accessory2: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "accessory_2",
    },
    accessory3: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "accessory_3",
    },
    dateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "date_time",
    },
  },
  {
    tableName: "Equipement",
  }
);

await Equipement.sync();

export default Equipement;

