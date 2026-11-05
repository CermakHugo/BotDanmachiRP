import * as CharacterRoute from "./CharacterRoute.js"
import * as StatusService from "../status/StatusService.js"
import * as MonsterService from "../monster/MonsterService.js";
import races from "../../data/races.js";
import { getStatEmojis } from "../../data/emoji/stats.js";
import * as MagicService from "../magic/MagicService.js";
import * as CharacterView from "./CharacterView.js";
import * as serverSetupService from "../serverSetup/serverSetupService.js";
import * as familiaService from "../familia/familiaService.js";
function getModalTextValue(interaction, customId) {
    if (interaction.fields && typeof interaction.fields.getTextInputValue === "function") {
        return interaction.fields.getTextInputValue(customId);
    }
    if (interaction.fields && typeof interaction.fields.getField === "function") {
        const field = interaction.fields.getField(customId);
        return field?.value ?? "";
    }
    const altField = interaction.fields?.fields?.get?.(customId);
    return altField?.value ?? "";
}

function getModalSelectValue(interaction, customId) {
    if (interaction.fields && typeof interaction.fields.getStringSelectValues === "function") {
        const values = interaction.fields.getStringSelectValues(customId);
        return Array.isArray(values) ? values[0] : null;
    }
    if (interaction.fields && typeof interaction.fields.getField === "function") {
        const field = interaction.fields.getField(customId);
        if (Array.isArray(field?.values)) return field.values[0] ?? null;
        return field?.value ?? null;
    }
    return null;
}


export async function getCharacter(idCharacter){
    return await CharacterRoute.findCharacterById(idCharacter);
}

export async function getCharacterByUserId(userId){
    return await CharacterRoute.getCharacterForDiscordUser(userId);
}

function haveCorrectOld(age){
    return !isNaN(age) && age >= 10 && age <= 100;
}

export async function createCharacter(interaction){
    const userId = interaction.user.id;
    const name = getModalTextValue(interaction, "nom");
    const ageText = getModalTextValue(interaction, "age");
    const age = parseInt(ageText, 10);
    const raceInputValue = getModalSelectValue(interaction, "race");
    const origin = getModalTextValue(interaction, "origine") || "Inconnue";
    const appearance = getModalTextValue(interaction, "appearance") || null;
    const raceKey = await findRaceKey(raceInputValue);
    const characterRace = raceKey;

    if(!haveCorrectOld(age)){
        return null;
    }
    if(!characterRace){
        return null;
    }

    const character = {
        characterId : userId,
        userId : userId,
        name : name,
        age : age,
        race : characterRace,
        origin : origin,
        appearance : appearance,
        level : 1,
    }
    const status = await  StatusService.createStatus(character)
    const characterCreated = await CharacterRoute.createCharacter(character, {status: status});

    return characterCreated;
}

export async function getLatestStatus(character) {
    return await CharacterRoute.getLastStatus(character);
}


async function findRaceKey(raceInput){
    if(!raceInput) return null;
    return await Object.keys(races).find(
        (r) => r.toLowerCase() === raceInput.toLowerCase()
    );
}

export async function setMaxLifeAndStamina(character){
    
    const raceKey = await findRaceKey(character.race);

    const bonusHealthPct = raceKey && races[raceKey].health ? races[raceKey].health : 0;
    const bonusStaminaPct = raceKey && races[raceKey].stamina ? races[raceKey].stamina : 0;

    const baseHealth = (await getTotalEndurance(character)) * 10;
    const baseStamina = (await getTotalAgility(character)) * 5;

    character.maxHealth = Math.round(baseHealth * (1 + (Number(bonusHealthPct) || 0) / 100));
    character.maxStamina = Math.round(baseStamina * (1 + (Number(bonusStaminaPct) || 0) / 100));
    character.health = character.maxHealth;
    character.stamina = character.maxStamina;
    return CharacterRoute.saveCharacter(character);
}

export async function learnAboutMonster(characterId, monsterId){
    const character = await CharacterRoute.findCharacterById(characterId)
    const monster = await MonsterService.getMonster(monsterId);
    return await CharacterRoute.learnAboutMonster(character, monster);
}

    /**
 * Vérifie si le personnage peut réaliser un Great Feat.
 * Par exemple, si toutes les statistiques principales sont supérieures à un seuil.
 */
export function canPerformGreatFeat(statsRecord) {
    const mainStats = [
    statsRecord.strength,
    statsRecord.agility,
    statsRecord.endurance,
    statsRecord.dexterity,
    statsRecord.intelligence,
    ];
// Ici, on considère qu'un Great Feat est possible si toutes les stats sont au moins à 900
    return Math.min(...mainStats) >= 900;
}

/**
 * Lorsqu'un personnage monte de niveau, on ajoute un bonus fixe sur chaque stat principale.
 * Cela garantit qu'un personnage de niveau supérieur aura toujours des stats supérieures.
 */

export async function levelUp(statsRecord) {
    statsRecord.level += 1;
    const bonus = 200; // Bonus fixe pour chaque montée de niveau
    statsRecord.strength += bonus;
    statsRecord.agility += bonus;
    statsRecord.endurance += bonus;
    statsRecord.dexterity += bonus;
    statsRecord.intelligence += bonus;
// Vous pouvez également ajuster la vie et la stamina, par exemple :
    statsRecord.health += bonus;  // ou recalculer en fonction de endurance
    statsRecord.stamina += bonus / 2;
    await statsRecord.save();
}

let regenJobStarted = false;

const MAIN_GUILD_ID = process.env.MAIN_GUILD_ID || process.env.GUILD_ID || null;

function normalizeForMatch(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getRemainingReviveMs(character, healAfterMs) {
  const last = character?.lastDamageAt ? new Date(character.lastDamageAt).getTime() : null;
  if (!last) return healAfterMs;
  return (last + healAfterMs) - Date.now();
}

async function resolveFamiliaAnnouncementChannelId({ client, guildId, familiaName } = {}) {
  if (!client) return null;
  const fam = (familiaName || "").toString().trim();
  if (!fam || fam === "Aucune") return null;
  const famKey = normalizeForMatch(fam);

  const findByGuildStructure = async (guild) => {
    if (!guild) return null;
    const channels = guild.channels?.cache;
    if (!channels) return null;

    const category = Array.from(channels.values()).find(
      (ch) => ch?.type === 4 && normalizeForMatch(ch.name) === famKey
    );
    if (!category) return null;

    const announcement = Array.from(channels.values()).find((ch) => {
      if (!ch?.parentId || ch.parentId !== category.id) return false;
      const name = normalizeForMatch(ch.name);
      return name.includes("annonce");
    });

    return announcement?.id ?? null;
  };

  if (guildId) {
    const fromSetup = await serverSetupService.getFamiliaChannelId(guildId, fam, "annonce").catch(() => null);
    if (fromSetup) return fromSetup;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    const byStructure = await findByGuildStructure(guild);
    if (byStructure) return byStructure;
  } else {
    for (const g of client.guilds.cache.values()) {
      const fromSetup = await serverSetupService.getFamiliaChannelId(g.id, fam, "annonce").catch(() => null);
      if (fromSetup) return fromSetup;
      const byStructure = await findByGuildStructure(g);
      if (byStructure) return byStructure;
    }
  }

  // Fallback ancienne table familia (announcementChannelId)
  const familia = await familiaService.getFamiliaByName(fam).catch(() => null);
  return familia?.announcementChannelId ?? null;
}

async function announceDeath(client, { guildId, character, healAfterMs } = {}) {
  if (!client || !character) return;
  const channelId = await resolveFamiliaAnnouncementChannelId({
    client,
    guildId,
    familiaName: character.familia,
  });
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const remainingMs = getRemainingReviveMs(character, healAfterMs);
  const embed = CharacterView.buildDeathAnnouncementEmbed(character, { remainingMs });
  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function announceRevive(client, { guildId, character } = {}) {
  if (!client || !character) return;
  const channelId = await resolveFamiliaAnnouncementChannelId({
    client,
    guildId,
    familiaName: character.familia,
  });
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = CharacterView.buildReviveAnnouncementEmbed(character);
  await channel.send({ embeds: [embed] }).catch(() => {});
}

export function startHealthRegenJob({ intervalMs = 60_000, healAfterMs = 3_600_000, client, guildId } = {}) {
  if (regenJobStarted) return;
  regenJobStarted = true;

  setInterval(async () => {
    try {
      const dueDate = new Date(Date.now() - healAfterMs);
      const dueCharacters = client
        ? await CharacterRoute.listDeadCharactersDueForHeal(dueDate).catch(() => [])
        : [];
      const healedCount = await CharacterRoute.healDueCharacters(dueDate);

      if (client && dueCharacters.length) {
        for (const character of dueCharacters) {
          await announceRevive(client, { guildId: null, character });
        }
      }

    } catch (err) {
      console.error("[HealthRegen] error:", err);
    }
  }, intervalMs);
}

export async function syncFighterHealth(fighter, { client, guildId, healAfterMs = 3_600_000 } = {}) {
  if (!fighter) return null;

  const character = await CharacterRoute.findCharacterById(fighter.id);
  if (!character) return null;

  const prevHealth = character.health ?? 0;
  const maxHealth = character.maxHealth ?? prevHealth;
  const prevDead = character.isDead;

  let health = fighter.life;
  if (health < 0) health = 0;
  if (maxHealth > 0 && health > maxHealth) health = maxHealth;

  if (health < prevHealth) {
    character.lastDamageAt = new Date();
  }

  character.health = health;
  character.isDead = (health == 0);

  await CharacterRoute.saveCharacter(character);

  const becameDead = character.isDead && (!prevDead || prevHealth > 0);
  if (becameDead) {
    await announceDeath(client, { guildId, character, healAfterMs });
  }
  
  if (prevDead && !character.isDead) {
    await announceRevive(client, { guildId, character });
  }

  return character;
}

export async function deleteCharacter(characterId){
    return await CharacterRoute.removeCharacter(characterId);
}

export async function createNewMagicForCharacter(character){
    const characterModel = await CharacterRoute.findCharacterById(character.id);
    return await MagicService.createMagic(characterModel);
}

export function isCharacterOnExpedition(userId) {
  return Object.values(groupSearches || {}).some((session) => {
    if (!session?.isFinalized) return false;
    return (session.members || []).some(
      (m) => (m.status === "leader" || m.status === "accepted") && m.id === userId
    );
  });
}

export function getCharacterInfo(character, discordClient){
  const statEmojis = getStatEmojis(discordClient);
  return `Level: ${character.level}
    ${statEmojis.health} ${character.health}/${character.maxHealth}
    ${statEmojis.stamina} ${character.stamina}/${character.maxStamina}
    ${statEmojis.magie} Mana: ${character.mana}/${character.maxMana}`;
}

export async function getPendingStats(character) {
  return await CharacterRoute.getPendingStat(character);
}



