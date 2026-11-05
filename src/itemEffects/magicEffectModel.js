import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"
import {Condition} from "../condition/conditionModel.js";

export const MagicEffect = sequelize.define("MagicEffect", {
    magicEffectId: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    magicEffectType : {
        type: DataTypes.ENUM("Positive", "Neutre", "Negatif"),
        defaultValue: "Neutre",
    },
    magicEffect: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    isFlat: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue : false,
    },
    power: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue : 0
    },
})

MagicEffect.hasOne(Condition, {
    sourceKey : 'magicEffectId',
    foreignKey: {
      name : 'magicEffectId',
      type: DataTypes.INTEGER,
      allowNull : false,
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
);

await MagicEffect.sync();

export default MagicEffect
