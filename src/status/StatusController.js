import * as StatusService from "./StatusService.js";
import * as StatusView from "./StatusView.js"
import * as GodHandler from "../../handlers/godHandler.js"

export async function createNewStatus(character) {
  return await StatusService.createStatus(character);
}

export async function applyDivineUpdate(interaction, character, currentStatus, pendingStats) {  
  const memberRoles = interaction.member?.roles?.cache
        ? [...interaction.member.roles.cache.values()].map((r) => ({ id: r.id, name: r.name }))
        : [];
  const guildId = interaction.guildId ?? null;
  const oldStatus = currentStatus;

  const divinePrompt = await StatusService.prepareDivineUpdateContext(character, memberRoles, guildId, pendingStats);
  console.log(divinePrompt)
  const divineResponse = await StatusService.getDivineUpdateResponse(character, divinePrompt)
  console.log(divineResponse)
  const newStatus = await StatusService.applyDivineUpdate(pendingStats, oldStatus);
  const statusProgressInfo = await StatusService.getStatusesProgressInfo(interaction.client, oldStatus, newStatus)
  console.log(statusProgressInfo)
  //const characterGodness = await GodHandler.resolveGodKey(guildId, character.familia, memberRoles)
  const characterGodness = await GodHandler.getCharacterGodness(character);
  console.log(characterGodness)
  const updateEmbed = await StatusView.buildUpdatedStatusEmbed(characterGodness , divineResponse, statusProgressInfo);
  return await StatusView.showUpdatedStatusAfterDiffer(interaction, [updateEmbed])
}

export async function getAllStats(character) {
  return await StatusService.getAllStats(character);
}


