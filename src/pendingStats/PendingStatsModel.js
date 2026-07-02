import { DataTypes } from "sequelize";
import { sequelize } from "../../database/db.js";

// Ne pas importer Character ici pour éviter les dépendances circulaires

export const PendingStats = sequelize.define("PendingStats", {
  characterId: { type: DataTypes.STRING, allowNull: true },
  pendingStrengthBonus: { type: DataTypes.INTEGER, defaultValue: 0 },
  pendingAgilityBonus: { type: DataTypes.INTEGER, defaultValue: 0 },
  pendingEnduranceBonus: { type: DataTypes.INTEGER, defaultValue: 0 },
  pendingDexterityBonus: { type: DataTypes.INTEGER, defaultValue: 0 },
  pendingIntelligenceBonus: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  timestamps: true,
});

await sequelize.sync();

export default PendingStats;
