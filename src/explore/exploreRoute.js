import { Character } from "../character/CharacterModel.js";
import { ExplorationLog } from "./ExploreModel.js";

export async function findCharacterByUserId(userId) {
  if (!userId) return null;
  return Character.findOne({ where: { userId } });
}

export async function saveCharacter(character) {
  if (!character) return null;
  return character.save();
}

export async function createExplorationLog(entry) {
  if (!entry?.userId) return null;
  return ExplorationLog.create({
    userId: entry.userId,
    sessionId: entry.sessionId ?? null,
    floor: Number.isFinite(entry.floor) ? entry.floor : 0,
    action: entry.action || "explore",
    mode: entry.mode ?? null,
    monsterName: entry.monsterName ?? null,
    lootSummary: entry.lootSummary ?? null,
    userText: entry.userText ?? null,
    narration: entry.narration ?? null,
  });
}
