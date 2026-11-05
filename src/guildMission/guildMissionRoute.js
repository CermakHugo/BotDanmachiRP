import { GuildMission, GuildMissionParticipant } from "./guildMissionModel.js";
import { sequelize } from "../../database/db.js";
import { Op } from "sequelize";

export async function withTransaction(handler) {
  return sequelize.transaction(async (transaction) => handler(transaction));
}

export async function createMission(payload, transaction) {
  return GuildMission.create(payload, { transaction });
}

export async function updateMission(mission, values, transaction) {
  await mission.update(values, { transaction });
  return mission;
}

export async function setMissionMessageId(missionId, messageId, transaction) {
  return GuildMission.update({ messageId }, { where: { missionId }, transaction });
}

export async function findMissionById(missionId, transaction) {
  return GuildMission.findByPk(missionId, {
    include: [{ model: GuildMissionParticipant }],
    transaction,
  });
}

export async function listOpenMissionsByType(objectiveType, transaction) {
  return GuildMission.findAll({
    where: {
      objectiveType,
    },
    include: [{ model: GuildMissionParticipant }],
    transaction,
  });
}

export async function findParticipant(missionId, characterId, transaction) {
  return GuildMissionParticipant.findOne({ where: { missionId, characterId }, transaction });
}

export async function createParticipant(payload, transaction) {
  return GuildMissionParticipant.create(payload, { transaction });
}

export async function updateParticipant(participant, values, transaction) {
  await participant.update(values, { transaction });
  return participant;
}

export async function listParticipants(missionId, transaction) {
  return GuildMissionParticipant.findAll({ where: { missionId }, transaction });
}

export async function countAcceptedParticipants(missionId, transaction) {
  return GuildMissionParticipant.count({ where: { missionId }, transaction });
}

export async function countCompletedParticipants(missionId, transaction) {
  return GuildMissionParticipant.count({
    where: {
      missionId,
      completedAt: { [Op.ne]: null },
    },
    transaction,
  });
}

export async function deleteMission(missionId, transaction) {
  return GuildMission.destroy({ where: { missionId }, transaction });
}

export default {
  withTransaction,
  createMission,
  updateMission,
  setMissionMessageId,
  findMissionById,
  listOpenMissionsByType,
  findParticipant,
  createParticipant,
  updateParticipant,
  listParticipants,
  countAcceptedParticipants,
  countCompletedParticipants,
  deleteMission,
};



