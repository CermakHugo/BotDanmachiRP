import * as equipmentService from "../../equipment/equipmentService.js";

export class Fighter{
    id;
    fighterModel;
    name;
    level;
    life;
    fighterType;
    agro = 0;
    hasParalized = false;
    isDead = false;
    burn = 0;
    gel = 0;
    poison = 0;
    paralysis = 0;
    confusionLevel = 0;
    numberCounterPossible = 0;
    comboLengthMax = 1;
    attackLength = 1;
    damageBonus = 1;
    damageBonusFlat = 0;
    initiative = 1;
    damageReduce = 0;
    damageReduceFlat = 0;
    strengthBonus = 0;
    agilityBonus = 0;
    dexterityBonus = 0;
    intelligenceBonus = 0;
    enduranceBonus = 0;
    mana;

    onBeginningFightEffects = new Map();
    onKillEffects = new Map();
    onDamageEffects = new Map();
    onDodgeEffects = new Map();
    onSpellCastEffect = new Map();
    onCritEffects = new Map();
    onParadeEffects = new Map();
    onHitEffects = new Map();
    onAlliesDieEffects = new Map();
    atEndTurnEffects = new Map();
    atFirstTurnEffects = new Map();
    onBeginningTurnEffect = new Map();
    onLessLifeEffects = new Map();
    onMonsterTypeEffects = new Map();

    marks = new Map();
    statuses = new Array();
    abilities = new Array();
    spells = new Array();

    actionList = new Array();
    constructor(fighter, fighterType){
        try{
            this.id = (fighterType == FighterType.PLAYER) ? fighter.characterId : fighter.name;
            this.fighterType = fighterType;
            this.fighterModel = fighter; 
        } catch(e){
            console.log(`Erreur dans la création d'un combatant :\n${e}`)
        }
    }

    static async create(fighter, fighterType){
        const fighterInstance = new Fighter(fighter, fighterType)
        await fighterInstance.init();
        return fighterInstance;
    }

    async init(){
        this.name = this.fighterModel.name;
        this.level = this.fighterModel.level;
        this.statuses.push(... await this.fighterModel.getStatuses());
        this.life = this.fighterModel.health;
        this.maxLife = this.fighterModel.maxHealth;
        if(this.fighterType === FighterType.PLAYER){
            const weapon = await equipmentService.getEquippedWeapon(this.fighterModel.characterId);
            const armor = await equipmentService.getEquippedArmor(this.fighterModel.characterId);
            this.damageBonusFlat += weapon?.damage ?? 0
            this.damageReduce += armor?.resistance ?? 0
            this.dexterityBonus -= Math.max(0, Number(weapon?.dexterityMalus ?? 0));
            this.agilityBonus -= Math.max(0, Number(armor?.agilityMalus ?? 0));
        }
        this._isDead();
        this.spells.push(... await this.fighterModel.getMagic())
        const capacities = await this.fighterModel.getCapacities();
        if(capacities){
           capacities.forEach(async (skill) => {
            await skill.getCapacityEffects().forEach((effect) => {
                this.sortEffectOnTriggerCondition(skill, effect)
                })
            })
        }
    }

    sortEffectOnTriggerCondition(skill, effect){
        const triggerCondition = effect.getCondition().activeCondition;
        switch(triggerCondition){
            case "Début du combat":
                this.onBeginningFightEffects.set(effect, skill);
                break;
            case "Début du tour":
                this.onBeginningTurnEffect.set(effect, skill)
                break;
            case "Fin du Tour":
                this.atEndTurnEffects.set(effect, skill);
                break;
            case "Type de Monstre":
                this.onMonsterTypeEffects.set(effect, skill);
                break;
            case "Tuer une cible":
                this.onKillEffects.set(effect, skill);
                break;
            case "Frapper une cible":
                this.onHitEffects.set(effect, skill);
                break;
            case "Recevoir des dégâts":
                this.onDamageEffects.set(effect, skill);
                break;
            case "Premier tour":
                this.atFirstTurnEffects.set(effect, skill);
                break;
            case "Points de vie manquant":
                this.onLessLifeEffects.set(effect, skill);
                break;
            case "Bloquer une attaque":
                this.onParadeEffects.set(effect, skill);
                break;
            case "Esquiver une attaque":
                this.onDodgeEffects.set(effect, skill);
                break;
            case "Lancer un sort":
                this.onSpellCastEffect.set(effect, skill);
                break;
            default:
                this.onAlliesDieEffects.set(effect, skill);
                break;
        }
    }

    rollDice(){
        return this.randBetween(1, 100) + 1;
    }

    /** Génère un nombre aléatoire entre min et max (inclus) */
    randBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + 1;
    }
    // 1) Démarrer un combat 

            /*Permet de récupéré la force total d'un personnage*/
    getTotalStrength(){
        return this.statuses.reduce((total, value) => {return total + value.strength}, 0) + this.strengthBonus
    }

    /*Permet de récupéré l'agilité total d'un personnage*/

    getTotalAgility(){
        return Math.max(0, this.statuses.reduce((total, value) => {return total + value.agility}, 0) + this.agilityBonus)
    }

    /*Permet de récupéré l'endurance total d'un personnage*/

    getTotalEndurance(){
        return this.statuses.reduce((total, value) => {return total + value.endurance}, 0) + this.enduranceBonus
    }

    /*Permet de récupéré la force total d'un personnage*/

    getTotalIntelligence(){
        return this.statuses.reduce((total, value) => {return total + value.intelligence}, 0) + this.intelligenceBonus
    }

    /*Permet de récupéré la force total d'un personnage*/

    setLife(newLifeValue){
        this.life = newLifeValue
    }

    getTotalDexterity(){
        return Math.max(0, this.statuses.reduce((total, value) => {return total + value.dexterity}, 0) + this.dexterityBonus)
    }

    getDamageOnTarget(target){
        const percentage = Math.random();
        const maxDamage = this.getTotalStrength();
        const finalFlatDamage = Math.floor(maxDamage * percentage * this.damageBonus) + this.damageBonusFlat;
        const finalDamage = finalFlatDamage - Math.floor(finalFlatDamage * (target.damageReduce/100)) - target.damageReduceFlat;
        this.agro += finalDamage;
        return finalDamage;
    }

    _isDead(){
        this.isDead = this.life <= 0;
        return this.isDead
    }

    takeDamage(damage){
        this.life -= (this.life >= damage) ? damage : this.life;
        return this._isDead();
    }

    dodgeOrBlock(){
        const randomNumber = Math.random();
        const dodgeRatio =  this.getTotalAgility() / (this.getTotalAgility() + this.getTotalStrength())
        return (randomNumber >= dodgeRatio) ? "Block" : "Dodge"; 
    }

    ratioForce(ennemy){
        return this.getTotalStrength() / ennemy.getTotalStrength();
    }

    ratioAgility(ennemy){
        return this.getTotalAgility() / ennemy.getTotalAgility()
    }

    ratioDexterity(ennemy){
        return this.getTotalDexterity() / ennemy.getTotalDexterity(ennemy)
    }

    ratioEndurance(ennemy){
        return this.getTotalEndurance() / ennemy.getTotalEndurance()
    }

    ratioDamageAttack(ennemy){
        return this.randBetween(1, 100) * (this.ratioForce(ennemy)
        + this.ratioAgility(ennemy) + this.ratioDexterity(ennemy))/3
    }

    ratioDamageDefense(ennemy){
        return this.randBetween(1, 100) * (this.ratioEndurance(ennemy)
        + this.ratioAgility(ennemy) + this.ratioDexterity(ennemy))/3
    }

    ratioMagic(ennemy){
        return (this.getTotalIntelligence(this) / this.getTotalStrength(ennemy) + 
        this.getTotalIntelligence(this) / this.getTotalAgility(ennemy) + this.getTotalIntelligence(this) / this.getTotalDexterity(ennemy))
    }
}

export const FighterType = {MONSTER : "Monster", PLAYER : "Player"}

