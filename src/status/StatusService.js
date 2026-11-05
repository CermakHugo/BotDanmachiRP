import races from "../../data/races.js";
import gods from "../../data/gods.js";
import { getStatEmojis } from "../../data/emoji/stats.js";
import * as GodHandler from "../../handlers/godHandler.js"
import * as PendingStatsService from "../pendingStats/PendingStatsService.js";
import * as StatusRoute from "./StatusRoute.js"

// EMOJI LOCAL
// function getStatRank(value) {
//   const n = Number(value) || 0;
//   if (n >= 900) return "<:stat_S:1472001728256802937>";
//   if (n >= 800) return "<:stat_A:1472002691004633158>";
//   if (n >= 700) return "<:stat_b:1472206163939692758>";
//   if (n >= 600) return "<:stat_c:1472206192943169629>";
//   if (n >= 500) return "<:stat_d:1472206213423960074>";
//   if (n >= 400) return "<:stat_e:1472206236475986052>";
//   if (n >= 300) return "<:stat_f:1472206261578891465>";
//   if (n >= 200) return "<:stat_g:1472206280168050942>";
//   if (n >= 100) return "<:stat_h:1472206298903871691>";
//   return "I";
// }

// EMOJI PUBLIC SERVER
function getStatRank(value) {
  const n = Number(value) || 0;
  if (n >= 900) return "<:stat_S:1474377055851384884>";
  if (n >= 800) return "<:stat_A:1474377294553546928>";
  if (n >= 700) return "<:stat_B:1474377355807162438>";
  if (n >= 600) return "<:stat_C:1474377393941516328>";
  if (n >= 500) return "<:stat_D:1474377425969483902>";
  if (n >= 400) return "<:stat_E:1474377472295567543>";
  if (n >= 300) return "<:stat_F:1474377508114792610>";
  if (n >= 200) return "<:stat_G:1474377555023888414>";
  if (n >= 100) return "<:stat_H:1474377590692380783>";
  return "I";
}











function getRandomStat() {
  return Math.floor(Math.random() * 100) + 50;
}

function applyPercentBonus(base, percent) {
  const pct = Number(percent) || 0;
  const value = Math.round(Number(base) * (1 + pct / 100));
  return Math.max(50, Math.min(160, value));
}

export function buildNewStatus(character) {
  const raceKey = character?.raceKey || character?.race;
  const bonus = raceKey ? races?.[raceKey] : null;

  return {
    level: character.level,
    strength: applyPercentBonus(getRandomStat(), bonus?.strength),
    agility: applyPercentBonus(getRandomStat(), bonus?.agility),
    endurance: applyPercentBonus(getRandomStat(), bonus?.endurance),
    intelligence: applyPercentBonus(getRandomStat(), bonus?.intelligence),
    dexterity: applyPercentBonus(getRandomStat(), bonus?.dexterity),
  };
}

export async function createStatus(character) {
  return buildNewStatus(character);
}

export async function getPhysicalUpdateValue(pendingStats) {
  const physicalUpdateValue = pendingStats
    ? (pendingStats.pendingStrengthBonus || 0) +
      (pendingStats.pendingAgilityBonus || 0) +
      (pendingStats.pendingEnduranceBonus || 0) +
      (pendingStats.pendingDexterityBonus || 0) +
      (pendingStats.pendingIntelligenceBonus || 0)
    : 0;
  return physicalUpdateValue;
}

export async function applyDivineUpdate(pendingStats, lastStatus) {
  const newStatus = await addPendingStatsInStatus(lastStatus, pendingStats)
  await PendingStatsService.resetPendingStats(pendingStats);
  return newStatus;
}

async function addPendingStatsInStatus(lastStatus, pendingStats){
  lastStatus.strength += pendingStats.pendingStrengthBonus || 0;
  lastStatus.agility += pendingStats.pendingAgilityBonus || 0;
  lastStatus.endurance += pendingStats.pendingEnduranceBonus || 0;
  lastStatus.dexterity += pendingStats.pendingDexterityBonus || 0;
  lastStatus.intelligence += pendingStats.pendingIntelligenceBonus || 0;

  return await StatusRoute.saveStatus(lastStatus);
}

export function getStatusesProgressInfo(discordClient, statusBefore, statusAfter){
  const statEmojis = getStatEmojis(discordClient);
  return `${statEmojis.strength} ${statusBefore.strength} ${getStatRank(statusBefore.strength)} -> ${statusAfter.strength} ${getStatRank(statusAfter.strength)}
    ${statEmojis.agility} ${statusBefore.agility} ${getStatRank(statusBefore.agility)} -> ${statusAfter.agility} ${getStatRank(statusAfter.agility)}
    ${statEmojis.endurance} ${statusBefore.endurance} ${getStatRank(statusBefore.endurance)} -> ${statusAfter.endurance} ${getStatRank(statusAfter.endurance)}
    ${statEmojis.intelligence} ${statusBefore.intelligence} ${getStatRank(statusBefore.intelligence)} -> ${statusAfter.intelligence} ${getStatRank(statusAfter.intelligence)}
    ${statEmojis.dexterity} ${statusBefore.dexterity} ${getStatRank(statusBefore.dexterity)} - > ${statusAfter.dexterity} ${getStatRank(statusAfter.dexterity)})
    `
} 

export async function prepareDivineUpdateContext(character, guildId, memberRoles, pendingStats) {
  const godKey = await GodHandler.resolveGodKey({
    guildId,
    characterFamilia: character?.familia,
    memberRoles,
  });

  const physicalUpdateValue = await getPhysicalUpdateValue(pendingStats);

  const godData = gods[godKey] || gods.hestia;
  const characterName = character.name;
  const hasPendingChanges = physicalUpdateValue > 0;

  const magicNarrative =
    "Je percois en toi une montee en puissance mystique, signe que tu es pret a explorer des arcanes plus puissants.";
  
  const physicalNarrative =
    physicalUpdateValue > 0
      ? "Je remarque egalement une amelioration de tes capacites."
      : "Je ne detecte pas d'evolution notable dans tes aptitudes pour le moment.";
  
  const updateInstruction = hasPendingChanges
    ? "Confirme clairement que tu appliques la benediction divine et les progres du membre."
    : "Explique clairement qu'aucun changement chiffrable n'est a appliquer pour l'instant et encourage-le a continuer ses exploits.";
  
  const voiceHint = godData?.description
    ? `Inspire-toi de ce temperament: ${godData.description}`
    : "Ton coherent avec une divinite de DanMachi.";
  
  const divinePrompt = [
    `Incarne le role du dieu/deesse ${godKey}. ${voiceHint}`,
    "Reponds en 2 a 4 phrases maximum, en tutoyant l'aventurier.",
    `Adresse-toi a ${characterName} par son nom (au moins une fois), evite les formules generiques comme 'jeune aventurier'.`,
    "Reste immersif DanMachi, pas de ton formel ni administratif.",
    updateInstruction,
    magicNarrative,
    physicalNarrative,
    "Accorde ou confirme la benediction divine du membre de ta familia avec une vraie personnalite.",
  ].join("\n");

  return divinePrompt
}

export async function getDivineUpdateResponse(character, prompt){
  const characterGodnessName = character.familia;
  const godResponse = await GodHandler.generateGodResponse(character.characterId, characterGodnessName, prompt)
  return godResponse
}


export async function getLatestStatusForCharacter(character) {
  return await StatusRoute.getLatestStatus(character);
}

function getHealthState(character) {
  const current = Number(character?.health || 0);
  const max = Math.max(1, Number(character?.maxHealth || 1));
  if (character?.isDead || current <= 0) {
    return "Inconscient, incapable de combattre.";
  }
  const ratio = current / max;
  if (ratio <= 0.15) return "Etat critique, vacille a chaque pas.";
  if (ratio <= 0.35) return "Gravement blesse, mouvements difficiles.";
  if (ratio <= 0.6) return "Entame, souffle irregulier.";
  if (ratio <= 0.85) return "Quelques blessures, encore stable.";
  return "Forme solide, pret a agir.";
}

export function buildCharacterStatsPayload({ character, status, isSelf, discordClient, viewerId, targetUser }) {
  const statEmojis = getStatEmojis(discordClient);
  const targetDisplayName = targetUser?.username || character?.name || "Aventurier";

  const numericStats = {
    strength: Number(status?.strength || 0),
    agility: Number(status?.agility || 0),
    endurance: Number(status?.endurance || 0),
    intelligence: Number(status?.intelligence || 0),
    dexterity: Number(status?.dexterity || 0),
  };

  const rankStats = {
    strength: getStatRank(numericStats.strength),
    agility: getStatRank(numericStats.agility),
    endurance: getStatRank(numericStats.endurance),
    intelligence: getStatRank(numericStats.intelligence),
    dexterity: getStatRank(numericStats.dexterity),
  };

  return {
    isSelf: Boolean(isSelf),
    viewerId,
    targetDisplayName,
    characterName: character?.name || targetDisplayName,
    familia: character?.familia || "Aucune",
    level: Number(status?.level || character?.level || 1),
    appearanceUrl: character?.appearance || null,
    healthState: getHealthState(character),
    statEmojis,
    numericStats,
    rankStats,
  };
}
