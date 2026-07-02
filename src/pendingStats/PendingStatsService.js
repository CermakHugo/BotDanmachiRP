
import * as PendingStatsRoute from "./PendingStatsRoute.js";


export async function createPendingStats(character){
    return await PendingStatsRoute.createPendingStats(character)
}

export async function addExperienceInPendingStats(pendingStats, experience){
    pendingStats.pendingStrengthBonus += experience.strength;
    pendingStats.pendingAgilityBonus += experience.agility;
    pendingStats.pendingDexterityBonus += experience.dexterity;
    pendingStats.pendingIntelligenceBonus += experience.intelligence;
    pendingStats.pendingEnduranceBonus += experience.endurance;

    return await PendingStatsRoute.savePendingStats(pendingStats)
}

export async function resetPendingStats(pendingStats){
    pendingStats.pendingStrengthBonus = 0;
    pendingStats.pendingAgilityBonus = 0;
    pendingStats.pendingEnduranceBonus = 0;
    pendingStats.pendingDexterityBonus = 0;
    pendingStats.pendingIntelligenceBonus = 0;
    pendingStats.pendingMaxMana = 0;
    pendingStats.pendingMaxStamina = 0;
    pendingStats.pendingMaxHealth = 0;

    return PendingStatsRoute.savePendingStats(pendingStats)
}
