import { Monster } from "./MonsterModel.js";
import { Op } from "sequelize";

Monster.beforeCreate((monster) => {
    if (!monster.maxHealth) {
        monster.maxHealth = monster.health;
    }
});

Monster.afterCreate( async (monster, options) => {
    // Exige que calculatedStats soit fourni dans les options
    const statusesData = options.statuses;
    if (!statusesData) {
        throw new Error("Les statistiques calculées doivent être fournies lors de la création d'un personnage.");
    }
    try {
        statusesData.forEach(async (status) => {
            await monster.createStatus(status);
            console.log(`Stats créées pour ${monster.name}`);
        })        
    } catch (error) {
        console.error("Erreur lors de la création des stats :", error);
    }
});

export async function getAllMonsters(){
    return await Monster.findAll();
}

export async function createMonster(monster, statuses) {
    try {
        const newMonster = await Monster.create(monster, statuses);
        console.log(`User ${monster.monsterId} has created the monster ${monster.name}.`);
        return newMonster;
    } catch(error) {
        console.error("Erreur lors de la création du personnage :\n", error);
        return ;
    }
}

export async function saveMonster(monster){
    return await monster.save();
}

export async function findMonsterById(idMonster){
    return await Monster.findOne({ where: { monsterId : idMonster } });
}

export async function  removeMonster(idMonster){
    try{
        const monster = this.findMonsterById(idMonster)
        if(monster){
            await Monster.destroy({where : {monsterId : idMonster}});
            console.log(`Monster ${monster.name} was deleted`);
            return true;
        } else {
            console.log(`Il n'existe pas de personnage associé à l'id ${idMonster}.`)
            return false;
        }
    } catch(e){
        console.error(`Error - Delete the monster ${idMonster} fail for reason : \n${e}`);
    }
}

export async function IsExisted(idMonster){
    return this.findMonsterById(idMonster)
}

export async function getAllMonstersKnowledge(character){
    return await character.getMonsters()
}

export async function getLastStatus(monster){
    try {
        const statuses = await monster.getStatuses({where : {level : monster.level}});
        if(statuses.length > 1){
            throw new Error(`Many status has find with paramater monsterId = ${monsterId} and level = ${monster.level} `);
        }
        const status = statuses[0];
        return status
    } catch (e){
        console.log(`Error during getLastStatus : ${e}`)
        return;
    }
    
}

export async function getMonsterInFloor(floorNumber){
    return await Monster.findAll({where : 
        { 
            floorMin : {[Op.lte] : floorNumber}, 
            floorMax : {[Op.gte] : floorNumber}
    }})
}

export async function searchMonstersByName(query, limit = 10) {
    const q = (query || "").toString().trim();
    if (!q) {
        return Monster.findAll({ limit, order: [["name", "ASC"]] });
    }
    return Monster.findAll({
        where: {
            [Op.or]: [
                { name: { [Op.like]: `%${q}%` } },
                { monsterId: { [Op.like]: `%${q}%` } },
            ],
        },
        limit,
        order: [["name", "ASC"]],
    });
}
