import { Op } from "sequelize";
import Character from "../character/CharacterModel.js";
import * as equipmentService from "../equipment/equipmentService.js";
import * as groupService from "../group/groupService.js";
import * as serverSetupService from "../serverSetup/serverSetupService.js";
import OnboardingProgress from "./onboardingModel.js";

export async function getCharacterByUserId(userId) {
  if (!userId) return null;
  return Character.findOne({
    where: {
      [Op.or]: [
        { userId: String(userId) },
        { characterId: String(userId) },
      ],
    },
  });
}

export async function getEquipmentByCharacterId(characterId) {
  if (!characterId) return null;
  return equipmentService.getCharacterEquipment(characterId);
}

export function getActiveExpeditionForUser(userId) {
  const sessions = Object.values(groupService.getAllSessions() || {});
  return sessions.find((session) => {
    if (!session?.isFinalized) return false;
    return (session.members || []).some(
      (member) => (member?.status === "leader" || member?.status === "accepted") && member.id === userId
    );
  }) || null;
}

export async function getServerChannelId(guildId, key) {
  if (!guildId) return null;
  return serverSetupService.getServerChannelId(guildId, key).catch(() => null);
}

export async function getFamiliaChannelId(guildId, familiaKey, subKey) {
  if (!guildId || !familiaKey || !subKey) return null;
  return serverSetupService.getFamiliaChannelId(guildId, familiaKey, subKey).catch(() => null);
}

export async function claimOnboardingCompletion(userId) {
  if (!userId) return false;
  const [record, created] = await OnboardingProgress.findOrCreate({
    where: { userId: String(userId) },
    defaults: { userId: String(userId), completedAt: new Date() },
  });

  if (!created && !record.completedAt) {
    record.completedAt = new Date();
    await record.save();
  }

  return created;
}

export default {
  getCharacterByUserId,
  getEquipmentByCharacterId,
  getActiveExpeditionForUser,
  getServerChannelId,
  getFamiliaChannelId,
  claimOnboardingCompletion,
};