import Character from "./CharacterModel.js";
import { Op } from "sequelize";
import * as equipmentService from "../equipment/equipmentService.js";


Character.beforeCreate((character) => {
    if (!character.maxHealth) {
        character.maxHealth = character.health;
    }
});

Character.afterCreate(async (character, options) => {
    // Exige que calculatedStats soit fourni dans les options
    const status = options.status;
    if (!status) {
        throw new Error("Les statistiques calculées doivent être fournies lors de la création d'un personnage.");
    }
    try {
        // Créer le Status pour ce personnage 
        await character.createStatus(status)
        console.log(`Status créées pour ${character.name}`)

        // Set la vie maximum en fonction de l'endurance et set la vie en fonction de la vie max
        character.maxHealth = status.endurance;
        character.health = character.maxHealth;
        saveCharacter(character)
        console.log(`Max health and health was updated for ${character.name}`)

        // Créer le record de PendingStats pour ce personnage
        await character.createPendingStat();
        console.log(`PendingStats créées pour ${character.name}`);
    } catch (error) {
        console.error("Erreur lors de la création des stats ou des pending stats :", error);
    }
});

export async function createCharacter(character, options) {
    try {
        const newCharacter = await Character.create(character, options);
        console.log(`User ${character.characterId} has created the character ${character.name}.`);
        return newCharacter;
    } catch(error) {
        console.error("Erreur lors de la création du personnage :\n", error);
        return ;
    }
}

export async function findCharacterByFamilia(idFamilia){
    return await Character.findOne({ where: { familia : idFamilia } });
}

export async function saveCharacter(character){
    return await character.save();
}

export async function findCharacterById(idCharacter){
    return await Character.findByPk(idCharacter);
}

export async function findCharacterByUserId(userId){
    return await Character.findOne({ where: { userId } });
}

export async function getCharacterForDiscordUser(userId){
    return (await findCharacterById(userId)) ?? (await findCharacterByUserId(userId));
}

export async function healDueCharacters(dueDate) {
  const [count] = await Character.update(
    {
      health: Character.sequelize.col("maxHealth"),
      isDead: false,
      lastDamageAt: null,
    },
    {
      where: {
        lastDamageAt: { [Op.lte]: dueDate },
        health: { [Op.lt]: Character.sequelize.col("maxHealth") },
      },
    }
  );

  return count;
}

export async function listDeadCharactersDueForHeal(dueDate) {
  if (!dueDate) return [];
  return Character.findAll({
    where: {
      isDead: true,
      lastDamageAt: { [Op.lte]: dueDate },
    },
  });
}

export async function removeCharacter(idCharatcer){
    try{
        const character = this.findCharacterById(idCharatcer)
        if(character){
            await Character.destroy({where : {characterId : idCharatcer}});
            console.log(`Character ${character.name} was deleted`);
            return true;
        } else {
            console.log(`Il n'existe pas de personnage associé à l'id ${idCharatcer}.`)
            return false;
        }
    } catch(e){
        console.error(`Error - Delete the character ${idCharatcer} fail for reason : \n${e}`);
    }
}

export async function IsExisted(idCharacter){
    return this.findCharacterById(idCharacter)
}

export async function learnAboutMonster(character, monster){
    try{
        const queryResponse = await character.addMonster(monster)
        console.log(`${character.name} has learn about ${monster.name}`)
        return queryResponse
    } catch(e){
        console.log(`Une erreur est survenu lors de l'ajout d'une ligne dans CharacterKnowledgeMonster : ${e}`);
        return;
    }
}

export async function getLastStatus(character) {
    try {
        const statuses = await character.getStatuses({where : {level : character.level}})
        if (!statuses || statuses.length > 1){
            throw new Error("None or many statuses was found.");
        }
        return statuses[0];
    } catch(e){
        console.log(`Error : ${e}`)
    }
    
}

export async function getPendingStat(character){
    try{
        return await character.getPendingStat()
    } catch(error){
        console.error(`Une erreur est survenu dans la récupération des Stats en attente de ${character.name} : \n ${error}`)
    }
}

export async function hasEquippedWeapon(character) {
    if (!character) return false;
    try {
        const weapon = await equipmentService.getEquippedWeapon(character.characterId);
        return Boolean(weapon);
    } catch {
        return false;
    }
}

export async function hasEquippedArmor(character) {
    if (!character) return false;
    try {
        const armor = await equipmentService.getEquippedArmor(character.characterId);
        return Boolean(armor);
    } catch {
        return false;
    }
}

