import Equipement from "./equipmentModel.js";

export async function getByCharacterId(characterId) {
  if (!characterId) return null;
  return Equipement.findOne({ where: { characterId } });
}

export async function upsertByCharacterId(characterId, values = {}) {
  if (!characterId) throw new Error("characterId requis.");

  const payload = {
    ...values,
    dateTime: new Date(),
  };

  const existing = await getByCharacterId(characterId);
  if (existing) {
    await existing.update(payload);
    return existing;
  }

  return Equipement.create({
    characterId,
    ...payload,
  });
}

export default {
  getByCharacterId,
  upsertByCharacterId,
};

