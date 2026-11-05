import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"
import {Condition} from "../condition/conditionModel.js";

export const CapacityEffect = sequelize.define("CapacityEffect", {
    capacityEffectId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    effect: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    isFlat : {
        type: DataTypes.BOOLEAN,
        allowNull : false,
        defaultValue : false
    },
    effectPower: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
    }
},
{
    tableName: "CapacityEffect",
})

CapacityEffect.hasOne(Condition, {
    sourceKey : 'capacityEffectId',
    foreignKey: {
      name : 'capacityEffectId',
      type: DataTypes.INTEGER,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
);

await CapacityEffect.sync();

export default CapacityEffect
