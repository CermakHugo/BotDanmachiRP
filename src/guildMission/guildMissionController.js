import * as MissionService from "./guildMissionService.js";
import * as MissionView from "./guildMissionView.js";
import * as CharacterService from "../character/CharacterService.js";
import * as GroupService from "../group/groupService.js";

function getMissionMessagePayload(mission) {
  return {
    embeds: [MissionView.buildMissionEmbed(mission)],
    components: MissionView.buildMissionComponents(mission),
  };
}

async function getRequesterCharacterId(discordUserId) {
  const character = await CharacterService.getCharacterByUserId(discordUserId);
  if (!character?.characterId) {
    throw new Error("Personnage introuvable.");
  }
  return String(character.characterId);
}

async function isUserInExpedition(discordUserId) {
  const character = await CharacterService.getCharacterByUserId(discordUserId);
  if (!character?.groupId) return false;

  const group = await GroupService.getGroupById(character.groupId).catch(() => null);
  if (!group) return false;

  return Boolean(group.expeditionTextChannelId || group.expeditionVoiceChannelId);
}

async function findMissionMessageById(client, guildId, messageId) {
  if (!client || !guildId || !messageId) return null;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;

  const channels = await guild.channels.fetch().catch(() => null);
  if (!channels) return null;

  for (const channel of channels.values()) {
    if (!channel?.isTextBased?.()) continue;
    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (msg) return msg;
  }

  return null;
}

export async function applyMissionCompletionDisplay(client, guildId, missionSnapshot) {
  if (!missionSnapshot?.messageId) return false;

  const missionMessage = await findMissionMessageById(client, guildId, missionSnapshot.messageId);
  if (!missionMessage) return false;

  await missionMessage.edit({
    embeds: [MissionView.buildMissionCompletedEmbed(missionSnapshot)],
    components: [],
  }).catch(() => {});

  return true;
}

export async function createGuildMission(interaction) {
  try {
    const title = interaction.options.getString("titre", true);
    const description = interaction.options.getString("description") || "";
    const objectiveType = interaction.options.getString("objectif", true);
    const objectiveTarget = interaction.options.getString("cible", true);
    const objectiveQuantity = interaction.options.getInteger("quantite") ?? 1;
    const requiredParticipants = interaction.options.getInteger("participants", true);
    const rewardType = interaction.options.getString("recompense_type") || "none";
    const rewardItem = interaction.options.getString("recompense_item") || "";
    const rewardQuantity = interaction.options.getInteger("recompense_quantite") ?? 0;

    const mission = await MissionService.createGuildMission({
      title,
      description,
      objectiveType,
      objectiveTarget,
      objectiveQuantity,
      requiredParticipants,
      rewardType,
      rewardItem,
      rewardQuantity,
      createdBy: interaction.user.id,
    });

    await interaction.reply(getMissionMessagePayload(mission));

    const createdMessage = await interaction.fetchReply().catch(() => null);
    if (createdMessage?.id) {
      await MissionService.setMissionMessageId(mission.missionId, createdMessage.id);
    }
  } catch (error) {
    return interaction.reply({
      content: error.message || "Impossible de creer la mission.",
      ephemeral: true,
    });
  }
}

export async function acceptGuildMission(interaction, { missionId }) {
  try {
    const characterId = await getRequesterCharacterId(interaction.user.id);
    const mission = await MissionService.acceptMission(missionId, characterId);
    return interaction.update(getMissionMessagePayload(mission));
  } catch (error) {
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ content: error.message || "Impossible d'accepter la mission.", ephemeral: true });
    }
    return interaction.reply({ content: error.message || "Impossible d'accepter la mission.", ephemeral: true });
  }
}

export async function completeGuildMission(interaction, { missionId }) {
  try {
    const inExpedition = await isUserInExpedition(interaction.user.id);
    if (inExpedition) {
      return interaction.reply({
        content: "Impossible de valider une mission de guilde pendant une expedition.",
        ephemeral: true,
      });
    }

    const characterId = await getRequesterCharacterId(interaction.user.id);
    const outcome = await MissionService.completeMissionForParticipant(missionId, characterId);

    if (!outcome.completedNow) {
      return interaction.update(getMissionMessagePayload(outcome.mission));
    }

    const snapshot = outcome.mission;
    await interaction.update({
      embeds: [MissionView.buildMissionCompletedEmbed(snapshot)],
      components: [],
    });
  } catch (error) {
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ content: error.message || "Impossible de valider la mission.", ephemeral: true });
    }
    return interaction.reply({ content: error.message || "Impossible de valider la mission.", ephemeral: true });
  }
}

export default {
  createGuildMission,
  acceptGuildMission,
  completeGuildMission,
  applyMissionCompletionDisplay,
};
