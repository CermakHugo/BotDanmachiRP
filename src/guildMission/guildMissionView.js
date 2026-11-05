import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

function participantsAccepted(mission) {
  const list = mission.GuildMissionParticipants || [];
  return list.map((p) => p.characterId);
}

function participantsCompleted(mission) {
  const list = mission.GuildMissionParticipants || [];
  return list.filter((p) => p.completedAt).map((p) => p.characterId);
}

function formatAcceptanceLines(mission) {
  const accepted = participantsAccepted(mission);
  if (!accepted.length) return "Aucune acceptation pour l'instant.";
  return accepted.map((id) => `- <@${id}> a accepte la mission`).join("\n");
}

function formatCompletionLines(mission) {
  const list = mission.GuildMissionParticipants || [];
  if (!list.length) return "Aucune validation pour l'instant.";

  if (mission.objectiveType === "kill_monster") {
    return list
      .map((participant) => {
        const progress = Math.min(Number(participant.progressValue || 0), Number(mission.objectiveQuantity || 1));
        const done = participant.completedAt ? " ✅" : "";
        return `- <@${participant.characterId}> : ${progress}/${mission.objectiveQuantity}${done}`;
      })
      .join("\n");
  }

  const completed = participantsCompleted(mission);
  if (!completed.length) return "Aucune validation pour l'instant.";
  return completed.map((id) => `- <@${id}> a valide son objectif`).join("\n");
}

function objectiveLabel(mission) {
  if (mission.objectiveType === "kill_monster") {
    return `Tuer **${mission.objectiveQuantity}** x **${mission.objectiveTarget}**`;
  }
  return `Rapporter **${mission.objectiveQuantity}** x **${mission.objectiveTarget}**`;
}

function rewardLabel(missionOrSnapshot) {
  const rewardType = (missionOrSnapshot?.rewardType || "none").toString();
  const rewardQuantity = Number(missionOrSnapshot?.rewardQuantity || 0);
  const rewardItem = (missionOrSnapshot?.rewardItem || "").toString();

  if (rewardType === "money" && rewardQuantity > 0) {
    return `${rewardQuantity} valis par participant`;
  }

  if (rewardType === "item" && rewardItem && rewardQuantity > 0) {
    return `${rewardQuantity} x ${rewardItem} par participant`;
  }

  return "Aucune";
}

export function buildMissionEmbed(mission) {
  const acceptedCount = participantsAccepted(mission).length;
  const completedCount = participantsCompleted(mission).length;
  const required = mission.requiredParticipants;
  const isFull = acceptedCount >= required;

  return new EmbedBuilder()
    .setTitle(`Mission de Guilde: ${mission.title}`)
    .setDescription(mission.description || "Aucune description.")
    .addFields(
      { name: "Objectif", value: objectiveLabel(mission), inline: false },
      { name: "Recompense", value: rewardLabel(mission), inline: false },
      { name: "Participants requis", value: `${required}`, inline: true },
      { name: "Acceptations", value: `${acceptedCount}/${required}`, inline: true },
      { name: "Validations", value: `${completedCount}/${required}`, inline: true },
      { name: "Acceptations en cours", value: formatAcceptanceLines(mission), inline: false },
      { name: "Progression mission", value: formatCompletionLines(mission), inline: false }
    )
    .setColor(isFull ? 0x2ECC71 : 0xF1C40F)
    .setFooter({ text: mission.objectiveType === "kill_monster" ? "Validation automatique en combat." : "Accepte puis valide ta part de mission." })
    .setTimestamp();
}

export function buildMissionComponents(mission) {
  const acceptedCount = participantsAccepted(mission).length;
  const completedCount = participantsCompleted(mission).length;
  const acceptDisabled = acceptedCount >= mission.requiredParticipants;
  const completeDisabled = mission.objectiveType === "kill_monster";

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`guild_mission_accept:missionId=${mission.missionId}`)
        .setLabel(acceptDisabled ? "Acceptations closes" : "Accepter")
        .setStyle(ButtonStyle.Success)
        .setDisabled(acceptDisabled),
      new ButtonBuilder()
        .setCustomId(`guild_mission_complete:missionId=${mission.missionId}`)
        .setLabel(mission.objectiveType === "kill_monster"
          ? "Auto (combat)"
          : (completedCount >= mission.requiredParticipants ? "Mission terminee" : "Valider objectif"))
        .setStyle(ButtonStyle.Primary)
        .setDisabled(completeDisabled)
    ),
  ];
}

export function buildMissionCompletedEmbed(snapshot) {
  const participants = Array.isArray(snapshot.participantCharacterIds) ? snapshot.participantCharacterIds : [];
  const participantsText = participants.length ? participants.map((id) => `<@${id}>`).join(", ") : "Aucun";

  return new EmbedBuilder()
    .setTitle(`Mission accomplie: ${snapshot.title}`)
    .setDescription("La mission de guilde est officiellement terminee.")
    .addFields(
      {
        name: "Objectif accompli",
        value: snapshot.objectiveType === "kill_monster"
          ? `Monstre neutralise: **${snapshot.objectiveQuantity}** x **${snapshot.objectiveTarget}**`
          : `Loot rapporte: **${snapshot.objectiveQuantity}** x **${snapshot.objectiveTarget}**`,
        inline: false,
      },
      { name: "Recompense distribuee", value: rewardLabel(snapshot), inline: false },
      { name: "Participants", value: participantsText, inline: false }
    )
    .setColor(0x2ECC71)
    .setTimestamp();
}

export default {
  buildMissionEmbed,
  buildMissionComponents,
  buildMissionCompletedEmbed,
};


