// src/database/stats.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../database/db.js";

export const Status = sequelize.define("Statuses", {
  idStatus : {
    type: DataTypes.BIGINT, 
    primaryKey: true, 
    autoIncrement: true 
  },

  strength: { 
    type: DataTypes.INTEGER, 
    defaultValue: 50 
  },

  agility: { 
    type: DataTypes.INTEGER, 
    defaultValue: 50 
  },

  endurance: { 
    type: DataTypes.INTEGER, 
    defaultValue: 50
  },

  intelligence: { 
    type: DataTypes.INTEGER, 
    defaultValue: 50 
  },

  dexterity: { 
    type: DataTypes.INTEGER, 
    defaultValue: 50 
  }, 
  level: {
    type: DataTypes.INTEGER, 
    defaultValue : 1
  },

}, {
  timestamps: true,
});

await Status.sync();

export default Status;
