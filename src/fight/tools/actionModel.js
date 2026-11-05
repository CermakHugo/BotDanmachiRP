// src/services/combat/actionCost.js

/**
 * Calcule le coût effectif d'une action physique en fonction du type d'action et de l'endurance du personnage.
 * @param {string} actionType - Type d'action ("fight", "block", etc.)
 * @param {object} statsRecord - Record des statistiques du personnage (doit contenir le champ "endurance")
 * @returns {number} Le coût en stamina (minimum 1)
 */
function calculatePhysicalActionCost(actionType, statsRecord) {
    let baseCost;
    if (actionType === "fight") baseCost = 10;
    else if (actionType === "block") baseCost = 8;
    else baseCost = 5;
    
    const endurance = statsRecord.endurance || 10;
    const cost = baseCost / (1 + (endurance - 10) / 20);
    
    return Math.max(Math.round(cost), 1);
  }
  
  /**
   * Calcule le coût effectif d'une action magique en fonction du coût de base du sort et de la puissance magique du personnage.
   * Plus la valeur "magie" du personnage est élevée par rapport à la base (10), moins le coût effectif sera élevé.
   * @param {number} spellCost - Le coût de base du sort (défini dans le modèle Magic)
   * @param {object} statsRecord - Record des statistiques du personnage (doit contenir le champ "magie")
   * @returns {number} Le coût en mana (minimum 1)
   */
  function calculateMagicActionCost(spellCost, statsRecord) {
    const baseMagic = 10; // Valeur de magie de base
    const magie = statsRecord.magie || baseMagic;
    const cost = spellCost / (1 + (magie - baseMagic) / 20);
    return Math.max(Math.round(cost), 1);
  }

export class ActionModel{
    constructor(resume, author, target, damageType, value, valueMax, description){
        this.author = author;
        this.target = target;
        this.actionType = damageType;
        this.value = value;
        this.valueMax = valueMax;
        this.resume = resume;
        this.description = description
    }
}

export const actionTypes = {
  DODGE  : "Dodge",
  PARADE : "Parade",
  PHYSIC_DAMAGE : "Physic Damage",
  MAGICAL_DAMAGE : "Magical Damade",
  HEAL : "Heal",
  FLEE : "Flee",
}

  