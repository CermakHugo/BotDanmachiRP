import { DataTypes, QueryInterface } from "sequelize";
import {CapacityEffect} from "../capacityEffects/capacityEffectModel.js"
import { sequelize } from "../../database.js"

export const Capacity = sequelize.define("Capacity", {
    capacityId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        defaultValue: "Aucune",
    },
}, 
{
    tableName: "Capacity",
});

Capacity.hasMany(CapacityEffect, {
    foreignKey: {
      name : 'capacityId',
      type: DataTypes.INTEGER,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

 
await Capacity.sync();

export default Capacity