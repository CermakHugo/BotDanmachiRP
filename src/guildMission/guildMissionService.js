import * as MissionRoute from "./guildMissionRoute.js";
import { removeItem, addItem, addMoney } from "../inventory/inventoryService.js";

function clampParticipants(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(8, Math.trunc(n)));
}

function clampQuantity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(999, Math.trunc(n)));
}

function clampRewardQuantity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(999999, Math.trunc(n)));
}

function normalizeObjectiveType(value) {
  const v = (value || "").toString().trim().toLowerCase();
  if (v === "kill_monster" || v === "bring_loot") return v;
  throw new Error("Type d'objectif invalide.");
}

function normalizeRewardType(value) {
  const v = (value || "none").toString().trim().toLowerCase();
  if (["none", "money", "item"].includes(v)) return v;
  throw new Error("Type de recompense invalide.");
}

function normalizeTarget(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+\d+$/, "")
    .replace(/\s+/g, " ");
}

function buildMissionSnapshot(mission) {
  return {
    missionId: mission.missionId,
    title: mission.title,
    description: mission.description,
    objectiveType: mission.objectiveType,
    objectiveTarget: mission.objectiveTarget,
    objectiveQuantity: mission.objectiveQuantity,
    requiredParticipants: mission.requiredParticipants,
    rewardType: mission.rewardType,
    rewardItem: mission.rewardItem,
    rewardQuantity: mission.rewardQuantity,
    messageId: mission.messageId,
    participantCharacterIds: (mission.GuildMissionParticipants || []).map((p) => p.characterId),
  };
}

async function applyMissionRewards(snapshot) {
  const participantIds = Array.isArray(snapshot?.participantCharacterIds)
    ? snapshot.participantCharacterIds.map((id) => String(id))
    : [];

  if (!participantIds.length) return;

  if (snapshot.rewardType === "money" && Number(snapshot.rewardQuantity) > 0) {
    await Promise.all(participantIds.map((characterId) => addMoney(characterId, Number(snapshot.rewardQuantity) || 0)));
    return;
  }

  if (snapshot.rewardType === "item" && snapshot.rewardItem && Number(snapshot.rewardQuantity) > 0) {
    await Promise.all(
      participantIds.map((characterId) => addItem(characterId, snapshot.rewardItem, Number(snapshot.rewardQuantity) || 0))
    );
  }
}

function isMissionCompleted(mission) {
  const participants = mission.GuildMissionParticipants || [];
  const acceptedCount = participants.length;
  const completedCount = participants.filter((p) => Boolean(p.completedAt)).length;
  return acceptedCount >= mission.requiredParticipants && completedCount >= mission.requiredParticipants;
}

async function finalizeMissionIfCompleted(mission, transaction) {
  if (!isMissionCompleted(mission)) return null;

  const snapshot = buildMissionSnapshot(mission);
  await applyMissionRewards(snapshot);
  await MissionRoute.deleteMission(mission.missionId, transaction);
  return snapshot;
}

export async function createGuildMission({
  title,
  description,
  objectiveType,
  objectiveTarget,
  objectiveQuantity,
  requiredParticipants,
  rewardType,
  rewardItem,
  rewardQuantity,
  createdBy,
}) {
  const normalizedRewardType = normalizeRewardType(rewardType);
  const normalizedRewardQuantity = clampRewardQuantity(rewardQuantity);
  const normalizedRewardItem = (rewardItem || "").toString().trim();

  if (normalizedRewardType === "item" && (!normalizedRewardItem || normalizedRewardQuantity <= 0)) {
    throw new Error("Pour une recompense item, renseigne recompense_item et recompense_quantite > 0.");
  }

  if (normalizedRewardType === "money" && normalizedRewardQuantity <= 0) {
    throw new Error("Pour une recompense valis, renseigne recompense_quantite > 0.");
  }

  const missionPayload = {
    title: (title || "").toString().trim(),
    description: (description || "").toString().trim(),
    objectiveType: normalizeObjectiveType(objectiveType),
    objectiveTarget: (objectiveTarget || "").toString().trim(),
    objectiveQuantity: clampQuantity(objectiveQuantity),
    requiredParticipants: clampParticipants(requiredParticipants),
    rewardType: normalizedRewardType,
    rewardItem: normalizedRewardType === "item" ? normalizedRewardItem : null,
    rewardQuantity: normalizedRewardType === "none" ? 0 : normalizedRewardQuantity,
    createdBy: String(createdBy),
  };

  if (!missionPayload.title) throw new Error("Titre de mission requis.");
  if (!missionPayload.objectiveTarget) throw new Error("Cible de mission requise.");

  return MissionRoute.withTransaction(async (transaction) => {
    return MissionRoute.createMission(missionPayload, transaction);
  });
}

export async function setMissionMessageId(missionId, messageId) {
  return MissionRoute.withTransaction(async (transaction) => {
    await MissionRoute.setMissionMessageId(missionId, messageId, transaction);
    return MissionRoute.findMissionById(missionId, transaction);
  });
}

export async function getMissionById(missionId) {
  return MissionRoute.withTransaction(async (transaction) => MissionRoute.findMissionById(missionId, transaction));
}

export async function acceptMission(missionId, characterId) {
  return MissionRoute.withTransaction(async (transaction) => {
    const mission = await MissionRoute.findMissionById(missionId, transaction);
    if (!mission) throw new Error("Mission introuvable.");

    const acceptedCount = await MissionRoute.countAcceptedParticipants(missionId, transaction);
    if (acceptedCount >= mission.requiredParticipants) {
      throw new Error("Le nombre de participants requis est deja atteint.");
    }

    const existing = await MissionRoute.findParticipant(missionId, String(characterId), transaction);
    if (existing) throw new Error("Tu as deja accepte cette mission.");

    await MissionRoute.createParticipant(
      {
        missionId,
        characterId: String(characterId),
        acceptedAt: new Date(),
        progressValue: 0,
      },
      transaction
    );

    return MissionRoute.findMissionById(missionId, transaction);
  });
}

export async function completeMissionForParticipant(missionId, characterId) {
  return MissionRoute.withTransaction(async (transaction) => {
    const mission = await MissionRoute.findMissionById(missionId, transaction);
    if (!mission) throw new Error("Mission introuvable.");

    if (mission.objectiveType === "kill_monster") {
      throw new Error("Cette mission se valide automatiquement en combat.");
    }

    const participant = await MissionRoute.findParticipant(missionId, String(characterId), transaction);
    if (!participant) throw new Error("Tu dois d'abord accepter la mission.");
    if (participant.completedAt) throw new Error("Tu as deja valide cette mission.");

    await removeItem(String(characterId), mission.objectiveTarget, mission.objectiveQuantity);

    await MissionRoute.updateParticipant(participant, {
      completedAt: new Date(),
      progressValue: mission.objectiveQuantity,
    }, transaction);

    const refreshed = await MissionRoute.findMissionById(missionId, transaction);
    const snapshot = await finalizeMissionIfCompleted(refreshed, transaction);

    if (!snapshot) return { mission: refreshed, completedNow: false };
    return { mission: snapshot, completedNow: true };
  });
}

export async function autoTrackKillMissions(monsterName, participantCharacterIds = []) {
  const normalizedMonster = normalizeTarget(monsterName);
  if (!normalizedMonster) return [];

  const participantSet = new Set((participantCharacterIds || []).map((id) => String(id)));
  if (!participantSet.size) return [];

  return MissionRoute.withTransaction(async (transaction) => {
    const openKillMissions = await MissionRoute.listOpenMissionsByType("kill_monster", transaction);
    const completedSnapshots = [];

    for (const mission of openKillMissions) {
      if (normalizeTarget(mission.objectiveTarget) !== normalizedMonster) continue;

      let changed = false;
      for (const participant of (mission.GuildMissionParticipants || [])) {
        if (!participantSet.has(String(participant.characterId))) continue;
        if (participant.completedAt) continue;

        const nextProgress = Number(participant.progressValue || 0) + 1;
        const updates = { progressValue: nextProgress };
        if (nextProgress >= mission.objectiveQuantity) {
          updates.completedAt = new Date();
        }

        await MissionRoute.updateParticipant(participant, updates, transaction);
        changed = true;
      }

      if (!changed) continue;

      const refreshed = await MissionRoute.findMissionById(mission.missionId, transaction);
      const snapshot = await finalizeMissionIfCompleted(refreshed, transaction);
      if (snapshot) completedSnapshots.push(snapshot);
    }

    return completedSnapshots;
  });
}

export default {
  createGuildMission,
  setMissionMessageId,
  getMissionById,
  acceptMission,
  completeMissionForParticipant,
  autoTrackKillMissions,
};
