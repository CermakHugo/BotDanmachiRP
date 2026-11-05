import * as MonsterService from "./MonsterService.js"
import * as MonsterView from "./MonsterView.js"
import * as CharacterService from "../character/CharacterService.js"


export async function createMonster(interaction){
    try {
        await MonsterView.deferReply(interaction);
        const {monster, status} = await MonsterService.createMonster(interaction);
        const embed = await MonsterView.createAdminMonsterEmbed(monster, status);
        console.log(`Image url = ${embed.data.image.url}`);
        return await MonsterView.showEmbed(interaction, embed);
    } catch(e){
        console.log(`Erreur survenu dans la création du monstre : ${e}`)
        return MonsterView.printEphemeralMessage(interaction, "Erreur survenu lors de la création du monstre")
    }
}

export async function getAllMonster(){
    return await MonsterService.getAllMonsters();
}

export async function showMonstersKnowledge(interaction, currentIndex){
    const character = await CharacterService.getCharacter(interaction.user.id);
    const allMonstersKnowledge = await MonsterService.getAllMonstersKnowledge(character);
    const monster = allMonstersKnowledge[currentIndex];
    const lastStatus = await MonsterService.getLastStatus(monster);
    const options = {
            character : character,
            allMonstersKnowledge : allMonstersKnowledge,
            currentIndex: currentIndex,
            monster : monster,
            status : lastStatus,
    };
    if(allMonstersKnowledge.length != 0){
        const monsterKnowledgeMessage = await MonsterView.createMonsterKnowledgeMessage(options);
        return await MonsterView.showBestiaire(interaction, monsterKnowledgeMessage, options);
    }else {
        await MonsterView.deferReply(interaction);
        const monsterKnowledgeMessage = await MonsterView.createVoidMonsterKnowledgeEmbed();
        return await MonsterView.showEmbed(interaction, monsterKnowledgeMessage)
    }
    
}