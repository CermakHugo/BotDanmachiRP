import * as StatusService from "./StatusService.js";
import * as StatusView from "./StatusView.js"
import * as GodHandler from "../../handlers/godHandler.js"
import * as CharacterService from "../character/CharacterService.js"

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




function reply(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

export async function showCharacterStats(interaction) {
  const targetUser = interaction.options.getUser("joueur") || interaction.user;
  const isSelf = targetUser.id === interaction.user.id;

  const character = await CharacterService.getCharacterByUserId(targetUser.id);
  if (!character) {
    return reply(interaction, { content: "Ce joueur n'a pas de personnage.", ephemeral: true });
  }

  const status = await StatusService.getLatestStatusForCharacter(character);
  if (!status) {
    return reply(interaction, { content: "Statut introuvable pour ce personnage.", ephemeral: true });
  }

  const payload = StatusService.buildCharacterStatsPayload({
    character,
    status,
    isSelf,
    discordClient: interaction.client,
    viewerId: interaction.user.id,
    targetUser,
  });

  const message = StatusView.buildCharacterStatsEmbed(payload);
  message.ephemeral = isSelf;
  return reply(interaction, message);
}
