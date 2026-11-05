import * as CharacterService from "./CharacterService.js"
import * as CharacterView from "./CharacterView.js"
import * as StatusController from "../status/StatusController.js"
import { ensureInventory } from "../inventory/inventoryService.js"
import * as onboardingController from "../onboarding/onboardingController.js";
import * as GroupService from "../group/groupService.js";


export async function showCharacterCreation(interaction){
    interaction = interaction;
    const id = interaction.user.id;
    const isExist = await CharacterService.getCharacter(id);
    if(isExist){
        console.log(`User ${id} have already a character.`)
        return CharacterView.printEphemeralMessage(interaction, "❌ Tu as déjà un personnage !");
    }
    const modal = CharacterView.createCharacterModal();
    await interaction.showModal(modal);
}

export async function createCharacter(interaction){
    try {
        const character = await CharacterService.createCharacter(interaction);
        if(!character){
            return CharacterView.printEphemeralMessage(interaction, "Erreur lors de la creation du personnage.")
        }

        const status = await CharacterService.getLatestStatus(character);
        if(!status){
            await CharacterService.deleteCharacter(character.characterId);
            return CharacterView.printEphemeralMessage(interaction, "Erreur lors de la creation du personnage.")
        }

        await ensureInventory(character.characterId);
        const embed = await CharacterView.createCharacterEmbed(character, status);
        await CharacterView.showEmbed(interaction, embed);
        await onboardingController.pushOnboardingUpdate(interaction).catch(() => {});
        return;
    } catch (error) {
        console.error("[CharacterController] createCharacter error:", error);
        return CharacterView.printEphemeralMessage(interaction, "Erreur lors de la creation du personnage.");
    }
}
export async function learnAboutMonster(interaction){
    const characterId = interaction.options.getUser('character').id;
    const monsterId = interaction.options.getString("monster");
    CharacterService.learnAboutMonster(characterId, monsterId)
    return CharacterView.printEphemeralMessage(interaction, `${characterId} vient d'apprendre sur le monstre : **${monsterId}**`)
}

export async function getCharacterById(characterId){
    return await CharacterService.getCharacter(characterId);
}

export function initCharacterJobs(client) {
  CharacterService.startHealthRegenJob({ client });
}

export async function updateCharacterStatus(interaction){
    await interaction.deferReply({ ephemeral: false, fetchReply: true });
    try {
        const userId = interaction.user.id;
        const character = await CharacterService.getCharacterByUserId(userId);
        if (!character) return await CharacterView.printErrorNoCharacterFound(interaction)

        if (character.groupId) {
            const group = await GroupService.getGroupById(character.groupId).catch(() => null);
            if (group) {
                return await interaction.editReply({
                    content: "Impossible d'utiliser /divine_update pendant une expedition.",
                    ephemeral: true,
                });
            }
        }

        const lastStatus = await CharacterService.getLatestStatus(character);
        if (!lastStatus) return await CharacterView.printErrorNoStatusFound(interaction);

        const pendingStats = await CharacterService.getPendingStats(character);
        if (!pendingStats) return await CharacterView.printErrorNoPendingStatsFound(interaction);
        await StatusController.applyDivineUpdate(interaction, character, lastStatus, pendingStats);
       return 
    } catch (error) {
        console.error("Erreur dans /divine_update :", error);
        await interaction.editReply({
        content: "Une erreur est survenue lors de la mise a jour divine.",
        ephemeral: true,
        });
    }
}