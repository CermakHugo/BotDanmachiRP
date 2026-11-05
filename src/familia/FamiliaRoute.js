import { Op } from "sequelize";
import { Character } from "../../database/models.js";
import { Familia, FamiliaElection, FamiliaVote } from "./familiaModel.js";

export async function upsertFamiliaByName(name, values = {}) {
  const [familia] = await Familia.findOrCreate({
    where: { name },
    defaults: { ...values },
  });

  let changed = false;
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    if (!familia[key]) {
      familia[key] = value;
      changed = true;
    }
  }

  if (changed) {
    await familia.save();
  }

  return familia;
}

export async function setFamiliaFields(familiaId, values = {}) {
  await Familia.update(values, { where: { id: familiaId } });
  return Familia.findByPk(familiaId);
}

export async function getFamiliaByName(name) {
  return Familia.findOne({ where: { name } });
}

export async function getFamiliaById(id) {
  return Familia.findByPk(id);
}

export async function listFamilias() {
  return Familia.findAll();
}

export async function countMembersByFamiliaName(familiaName) {
  return Character.count({ where: { familia: familiaName } });
}

export async function listMembersByFamiliaName(familiaName) {
  return Character.findAll({ where: { familia: familiaName } });
}

export async function getCharacterByUserId(userId) {
  return Character.findOne({ where: { userId } });
}

export async function listDistinctFamiliasFromCharacters() {
  const records = await Character.findAll({
    attributes: ["familia"],
    where: {
      familia: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }, { [Op.ne]: "Aucune" }],
      },
    },
  });
  return [...new Set(records.map((r) => r.familia).filter(Boolean))];
}

export async function getActiveElectionWithVotes(familiaId) {
  return FamiliaElection.findOne({
    where: { familiaId, status: "active" },
    include: [{ model: FamiliaVote, as: "votes" }],
  });
}

export async function countActiveElections(familiaId) {
  return FamiliaElection.count({ where: { familiaId, status: "active" } });
}

export async function createElection({ familiaId, reason, startAt, endAt }) {
  return FamiliaElection.create({
    familiaId,
    reason,
    startAt,
    endAt,
    status: "active",
  });
}

export async function listExpiredElections(now = new Date()) {
  return FamiliaElection.findAll({
    where: {
      status: "active",
      endAt: { [Op.lt]: now },
    },
  });
}

export async function listVotesForElection(electionId) {
  return FamiliaVote.findAll({ where: { electionId } });
}

export async function findVote(electionId, voterId) {
  return FamiliaVote.findOne({ where: { electionId, voterId } });
}

export async function upsertVote({ electionId, voterId, candidateId }) {
  const existingVote = await findVote(electionId, voterId);
  if (existingVote) {
    existingVote.candidateId = candidateId;
    await existingVote.save();
    return { updated: true };
  }

  await FamiliaVote.create({
    electionId,
    voterId,
    candidateId,
  });
  return { updated: false };
}

export async function completeElection({ electionId, winnerId }) {
  const election = await FamiliaElection.findByPk(electionId);
  if (!election) return null;

  election.status = "completed";
  election.winnerId = winnerId ?? null;
  await election.save();

  if (winnerId) {
    await Familia.update(
      { captainId: winnerId, captainAssignedAt: new Date() },
      { where: { id: election.familiaId } }
    );
  }

  return election;
}

