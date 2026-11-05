import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

export const MagicEffect = sequelize.define("MagicEffect", {
    magicEffectId: {
        type: DataTypes.DOUBLE,
        autoIncrement: true,
        primaryKey: true,
        allowNull : false,
    },
    effect: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
})

await MagicEffect.sync();

export default MagicEffect
