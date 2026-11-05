import * as MonsterRoute from "./MonsterRoute.js"
import * as MagicService from "../magic/MagicService.js";


export function getMonster(idMonster){
    return MonsterRoute.findMonsterById(idMonster);
}

export function getAllMonsters(){
    return MonsterRoute.getAllMonsters()
}
export async function getLastStatus(monster){
    return await MonsterRoute.getLastStatus(monster)
}

export async function getAllMonstersKnowledge(character){
    return await MonsterRoute.getAllMonstersKnowledge(character)
}

export function haveCorrectOld(age){
    return !isNaN(age) || age > 10 || age < 100 
}

export async function createMonster(interaction){
    const name =  interaction.options.getString("name");
    const description = interaction.options.getString("description");
    const level = interaction.options.getInteger("level");
    const appearance = interaction.options.getString("appearence");
    const floorMin = interaction.options.getInteger("floor_min");
    const floorMax = interaction.options.getInteger("floor_max");

    const strength = interaction.options.getInteger("strength")|0;
    const agility = interaction.options.getInteger("agility")|0;
    const dexterity = interaction.options.getInteger("dexterity")|0;
    const intelligence = interaction.options.getInteger("intelligence")
    const endurance = interaction.options.getInteger("endurance")|0;

    const hidenStrength = interaction.options.getInteger("hiden_strength")|0;
    const hidenAgility = interaction.options.getInteger("hiden_agility")|0;
    const hidenDexterity = interaction.options.getInteger("hiden_dexterity")|0;
    const hidenIntelligence = interaction.options.getInteger("hiden_intelligence")
    const hidenEndurance = interaction.options.getInteger("hiden_endurance")|0;

    const maxLife = (endurance + hidenEndurance) ;
    const life = maxLife

    const monster = {
        monsterId : name.toLowerCase(),
        name : name,
        description : description,
        level : level,
        appearance : appearance,
        floorMin : floorMin,
        floorMax : floorMax,
        maxHealth : maxLife,
        health : life,
    };

    const status = {
        level : level,
        strength : strength,
        agility : agility,
        dexterity : dexterity,
        intelligence : intelligence,
        endurance : endurance,
    };

    if(level > 1){
        const hidenStatus = {
            level : 1,
            strength : hidenStrength,
            agility : hidenAgility,
            dexterity : hidenDexterity,
            intelligence : hidenIntelligence,
            endurance : hidenEndurance,
        };
        const allStatuses = [status, hidenStatus];
        await MonsterRoute.createMonster(monster, {statuses :  allStatuses}) ;
    } else {
        const allStatuses = [status]
        await MonsterRoute.createMonster(monster, {statuses :  allStatuses});
    }
    return {monster, status};  
}

/*Permet de récupéré la force total d'un personnage*/

export async function deleteMonster(monsterId){
    return await MonsterRoute.removeMonster(monsterId);
}

export async function createNewMagicForMonster(monster){
    const monsterModel = await MonsterRoute.findMonsterById(monster.id);
    return await MagicService.createMagic(monsterModel);
}

export async function getMonsterInFloor(floorNumber){
    return await MonsterRoute.getMonsterInFloor(floorNumber)
}


