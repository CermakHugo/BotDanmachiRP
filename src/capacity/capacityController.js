import * as CapacityService from "./capacityService.js"
import * as CapacityView from "./capacityView.js"
import * as CharacterController from "../character/CharacterController.js"


export async function createCapacity(interaction){
    await CapacityView.deferEphemeralReply(interaction)
    const characterId = await interaction.options.getUser('character').id;
    const character = await CharacterController.getCharacterById(characterId);
    const newCapacity = await CapacityService.createCapacity(character);
    const effectsModels = await newCapacity.getCapacityEffects();
    const effectsMap = await CapacityService.getMapEffectCondition(effectsModels);
    const capacityMessage = await CapacityView.createAdminMessageForCapacity(newCapacity, effectsMap);
    return await CapacityView.editReply(interaction, capacityMessage);
}

export async function showCapacitys(interaction){
    await CapacityView.deferEphemeralReply(interaction)
}