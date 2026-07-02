import { Status } from "./StatusModel.js"

export async function createStatus(character) {
  const newStatus = buildNewStatus(character);
  if (character && typeof character.createStatus === "function") {
    return character.createStatus(newStatus);
  }
  return newStatus;
}

export async function updateStatus(status, newStatus) {
  try {
    await status.update(newStatus);
    await status.reload();
    return status;
  } catch (e) {
    console.error(`Echec : Status n'a pas pu être mis à jour\n${e}`);
    return null;
  }
}

export async function saveStatus(status) {
  try {
    await status.save();
    return status;
  } catch (e) {
    console.error(`Impossible de sauvegarder le status\n${e}`);
    return null;
  }
}

export async function getAllStats(character) {
  return await character.getAllStats();
}

export async function getLatestStatus(character) {
  if (!character) return null;
  const statuses = await character.getStatuses({ order: [["createdAt", "DESC"]], limit: 1 });
  return Array.isArray(statuses) ? statuses[0] : null;
}

export async function getPendingStats(character) {
  if (!character) return null;
  return await character.getPendingStat();
}
