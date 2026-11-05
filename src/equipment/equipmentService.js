import * as equipmentRoute from "./equipmentRoute.js";
import * as itemService from "../item/itemService.js";

export async function getCharacterEquipment(characterId) {
  return equipmentRoute.getByCharacterId(characterId);
}

export async function updateCharacterEquipment(characterId, values = {}) {
  return equipmentRoute.upsertByCharacterId(characterId, values);
}

export async function setStartingWeapon(character, weapon) {
  if (!character?.characterId) throw new Error("Personnage invalide.");
  if (!weapon) throw new Error("Arme invalide.");

  return updateCharacterEquipment(character.characterId, {
    rightHand: String(weapon.id ?? weapon.name ?? ""),
  });
}

export async function setStartingArmorSet(character, mainArmor) {
  if (!character?.characterId) throw new Error("Personnage invalide.");
  if (!mainArmor) throw new Error("Armure invalide.");

  return updateCharacterEquipment(character.characterId, {
    armor: String(mainArmor.id ?? mainArmor.name ?? ""),
  });
}

async function resolveEquippedItem(slotValue, expectedType) {
  if (!slotValue) return null;
  const raw = String(slotValue).trim();
  if (!raw) return null;

  try {
    if (/^\d+$/.test(raw)) {
      const byTypedId = await itemService.findItem(`${expectedType}:${raw}`);
      if (byTypedId?.category === expectedType) return byTypedId;
    }
  } catch {}

  try {
    const byName = await itemService.findItem(raw);
    if (byName?.category === expectedType) return byName;
  } catch {}

  return null;
}

export async function getEquippedWeapon(characterId) {
  const equipment = await getCharacterEquipment(characterId);
  return resolveEquippedItem(equipment?.rightHand ?? null, "weapon");
}

export async function getEquippedArmor(characterId) {
  const equipment = await getCharacterEquipment(characterId);
  return resolveEquippedItem(equipment?.armor ?? null, "armor");
}

export default {
  getCharacterEquipment,
  updateCharacterEquipment,
  setStartingWeapon,
  setStartingArmorSet,
  getEquippedWeapon,
  getEquippedArmor,
};
