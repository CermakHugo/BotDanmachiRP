import { DataTypes, QueryInterface } from "sequelize";
import {MagicEffect} from "../magicEffects/magicEffectModel.js"
import { sequelize } from "../../database.js"

export const Magic = sequelize.define("Magic", {
    magicId: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    manaCost: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue : 1,
        validate: { min: 1, max: 10 },
    },

    turnCost: { 
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: { min: 1, max: 10 },
        },

    description: {
        type: DataTypes.TEXT,
        defaultValue: "Aucune",
    },
}, 
{
    tableName: "Magic",
});

Magic.hasMany(MagicEffect, {
    foreignKey: {
      name : 'magicId',
      type: DataTypes.BIGINT,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

 
await Magic.sync();

export default Magic