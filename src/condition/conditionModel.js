import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

export const Condition = sequelize.define("Condition", {
    conditionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    activeCondition: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    scaleCondition: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    AoE: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue : 1,
    },
    isFlat: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue : false,
    },
    activeValue: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
})

await Condition.sync();

export default Condition
