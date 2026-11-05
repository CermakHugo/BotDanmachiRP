import { DataTypes } from "sequelize";
import { sequelize } from "../../database.js"

export const OnboardingProgress = sequelize.define(
  "OnboardingProgress",
  {
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "onboardingProgress",
  }
);

await OnboardingProgress.sync();

export default OnboardingProgress;