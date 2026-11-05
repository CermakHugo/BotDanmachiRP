import * as familiaRoute from "./FamiliaRoute.js";
import * as familiaView from "./familiaView.js";
import { createRequire } from "module";
import gods from "../../data/gods.js";
import { generateGodResponse } from "../../handlers/godHandler.js";
import { getFamiliaChannelId, getFamiliaRoleId } from "../serverSetup/serverSetupService.js";
import { listWeapons } from "../item/itemRoute.js";
import { filterStartingWeapons } from "../../data/startingLoadout.js";

const MIN_MEMBERS_FOR_ELECTION = 5;
const ELECTION_DURATION_DAYS = 2;
const MAIN_GUILD_ID = process.env.MAIN_GUILD_ID || process.env.GUILD_ID || null;
const require = createRequire(import.meta.url);
const rolesData = require("../../data/roles.json");
const generalChannelsData = require("../../data/generalFamiliaChannel.json");

function canonicalName(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

async function resolveGuild({ client, guild } = {}) {
  if (guild) return guild;
  if (!client || !MAIN_GUILD_ID) return null;
  return client.guilds.fetch(MAIN_GUILD_ID).catch(() => null);
}

export async function ensureFamiliaRecord({ name, roleId, announcementChannelId, captainRoleId } = {}) {
  const normalized = canonicalName(name);
  if (!normalized) throw new Error("Nom de familia invalide.");

  const values = {};
  if (roleId) values.roleId = roleId;
  if (announcementChannelId) values.announcementChannelId = announcementChannelId;
  if (captainRoleId) values.captainRoleId = captainRoleId;

  return familiaRoute.upsertFamiliaByName(normalized, values);
}

export async function ensureCaptainRoleForFamilia(familia, { guild, client } = {}) {
  if (!familia) return null;
  const resolvedGuild = await resolveGuild({ guild, client });
  if (!resolvedGuild) return null;

  const roleName = `Capitaine ${familia.name}`;
  let role = null;
  if (familia.captainRoleId) {
    role = await resolvedGuild.roles.fetch(familia.captainRoleId).catch(() => null);
  }

  if (!role) {
    role = await resolvedGuild.roles
      .create({
        name: roleName,
        color: 0xffc857,
        reason: `Role capitaine pour la familia ${familia.name}`,
      })
      .catch(() => null);
    if (role) {
      familia.captainRoleId = role.id;
      await familiaRoute.setFamiliaFields(familia.id, { captainRoleId: role.id });
    }
  }

  return role;
}

export async function getFamiliaByName(name, context = {}) {
  const normalized = canonicalName(name);
  if (!normalized) return null;
  const familia = await familiaRoute.getFamiliaByName(normalized);
  if (!familia) return null;
  if (context?.guild || context?.client) {
    await ensureCaptainRoleForFamilia(familia, context);
  }
  return familia;
}

export async function getOrCreateFamilia(name, context = {}) {
  const existing = await getFamiliaByName(name, context);
  if (existing) return existing;
  return ensureFamiliaRecord({ name, ...context });
}

export async function countMembers(familiaName) {
  const normalized = canonicalName(familiaName);
  if (!normalized) return 0;
  return familiaRoute.countMembersByFamiliaName(normalized);
}

export async function getMembers(familiaName) {
  const normalized = canonicalName(familiaName);
  if (!normalized) return [];
  return familiaRoute.listMembersByFamiliaName(normalized);
}

export async function getCharacterByUserId(userId) {
  if (!userId) return null;
  return familiaRoute.getCharacterByUserId(userId);
}

export async function getUserFamilia(userId) {
  const character = await getCharacterByUserId(userId);
  if (!character || !character.familia || character.familia === "Aucune") return null;
  return character.familia;
}

export async function getCaptainCharacter(familia) {
  if (!familia?.captainId) return null;
  return getCharacterByUserId(familia.captainId);
}

export async function getActiveElection(familiaId) {
  return familiaRoute.getActiveElectionWithVotes(familiaId);
}

export async function hasActiveElection(familiaId) {
  const count = await familiaRoute.countActiveElections(familiaId);
  return count > 0;
}

export function buildElectionWindow() {
  const now = new Date();
  const end = new Date(now.getTime() + ELECTION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  return { startAt: now, endAt: end };
}

export async function createElection(familia, { reason } = {}) {
  const { startAt, endAt } = buildElectionWindow();
  return familiaRoute.createElection({
    familiaId: familia.id,
    reason: reason || "renouvellement",
    startAt,
    endAt,
  });
}

export async function announceElection(client, familia, election) {
  if (!familia?.announcementChannelId) return;
  try {
    const channel = await client.channels.fetch(familia.announcementChannelId);
    if (!channel || !channel.isTextBased()) return;
    const members = await getMembers(familia.name);
    await channel.send(familiaView.buildElectionAnnouncement(familia, election, members));
  } catch (error) {
    console.error("[familiaService] annonce impossible", error);
  }
}

export async function announceCaptain(client, familia, election, winner) {
  if (!familia?.announcementChannelId) return;
  try {
    const channel = await client.channels.fetch(familia.announcementChannelId);
    if (!channel || !channel.isTextBased()) return;
    await channel.send(familiaView.buildElectionResult(familia, election, winner));
  } catch (error) {
    console.error("[familiaService] annonce resultat impossible", error);
  }
}

export async function maybeTriggerElection(
  familiaName,
  { reason = "premiere election", client, force = false } = {}
) {
  const familia = await getFamiliaByName(familiaName);
  if (!familia) return null;
  if (!force && (await hasActiveElection(familia.id))) return null;

  const memberCount = await countMembers(familia.name);
  if (!force && memberCount < MIN_MEMBERS_FOR_ELECTION) return null;

  const election = await createElection(familia, { reason });
  if (client) {
    await announceElection(client, familia, election);
  }
  return election;
}

export async function castVote(familiaName, voterId, candidateId) {
  const familia = await getFamiliaByName(familiaName);
  if (!familia) throw new Error("Familia inconnue.");

  const election = await getActiveElection(familia.id);
  if (!election) throw new Error("Aucune election en cours pour cette familia.");

  const [voter, candidate] = await Promise.all([
    getCharacterByUserId(voterId),
    getCharacterByUserId(candidateId),
  ]);

  if (!voter || voter.familia !== familia.name) {
    throw new Error("Tu ne fais pas partie de cette familia.");
  }
  if (!candidate || candidate.familia !== familia.name) {
    throw new Error("Le candidat n'est pas membre de cette familia.");
  }

  const result = await familiaRoute.upsertVote({ electionId: election.id, voterId, candidateId });
  return { election, updated: result.updated };
}

async function assignCaptainRole(client, familia, newCaptainId, previousCaptainId) {
  if (!client || !newCaptainId) return;
  const guild = await resolveGuild({ client });
  if (!guild) return;
  const role = await ensureCaptainRoleForFamilia(familia, { guild });
  if (!role) return;

  const updates = [];
  if (previousCaptainId && previousCaptainId !== newCaptainId) {
    const previous = await guild.members.fetch(previousCaptainId).catch(() => null);
    if (previous) {
      updates.push(previous.roles.remove(role).catch(() => {}));
    }
  }

  const member = await guild.members.fetch(newCaptainId).catch(() => null);
  if (member) {
    updates.push(member.roles.add(role).catch(() => {}));
  }
  await Promise.all(updates);
}

export async function closeElection(election, client) {
  const votes = await familiaRoute.listVotesForElection(election.id);

  const tally = votes.reduce((acc, vote) => {
    acc[vote.candidateId] = (acc[vote.candidateId] || 0) + 1;
    return acc;
  }, {});

  let winnerId = null;
  let bestScore = 0;
  let tie = false;
  for (const [candidateId, score] of Object.entries(tally)) {
    if (score > bestScore) {
      winnerId = candidateId;
      bestScore = score;
      tie = false;
    } else if (score === bestScore) {
      tie = true;
    }
  }
  if (tie) winnerId = null;

  const familia = await familiaRoute.getFamiliaById(election.familiaId);
  const previousCaptainId = familia?.captainId ?? null;

  await familiaRoute.completeElection({ electionId: election.id, winnerId });
  const updatedFamilia = await familiaRoute.getFamiliaById(election.familiaId);

  if (client && updatedFamilia) {
    const winner = winnerId ? await getCharacterByUserId(winnerId) : null;
    if (winnerId) {
      await assignCaptainRole(client, updatedFamilia, winnerId, previousCaptainId);
    }
    await announceCaptain(client, updatedFamilia, election, winner);
  }
}

export async function closeExpiredElections(client) {
  const expired = await familiaRoute.listExpiredElections(new Date());
  for (const election of expired) {
    await closeElection(election, client);
  }
}

export async function triggerMonthlyElections(client) {
  const familias = await familiaRoute.listFamilias();
  for (const familia of familias) {
    const memberCount = await countMembers(familia.name);
    if (memberCount < MIN_MEMBERS_FOR_ELECTION) continue;
    await maybeTriggerElection(familia.name, { reason: "renouvellement mensuel", client });
  }
}

export async function syncFamiliasFromCharacters(client) {
  const familiaNames = await familiaRoute.listDistinctFamiliasFromCharacters();
  for (const familiaName of familiaNames) {
    const familia = await ensureFamiliaRecord({ name: familiaName });
    if (client) {
      await ensureCaptainRoleForFamilia(familia, { client });
    }
  }
}

export async function evaluateJoinFamiliaRequest({ userId, chosenGod, characterName }) {
  if (!gods[chosenGod]) {
    return { accepted: false, aiResponse: "Ce dieu/deesse n'existe pas dans cet univers." };
  }

  const godDescription = gods[chosenGod].description;
  const accepted = Math.random() < 0.5;
  const decisionLine = accepted
    ? "Ta decision finale est de l'accepter dans ta Familia. Fais-le clairement comprendre."
    : "Ta decision finale est de refuser sa demande. Fais-le clairement comprendre.";

  const aiPrompt = `
  Tu es ${chosenGod}, une divinite de l'univers de DanMachi.
  Ton temperament est ${godDescription}.

  Un aventurier nomme ${characterName} vient humblement te demander d'entrer dans ta Familia.

  Reagis directement a lui, comme si tu lui parlais en face, avec ton style unique.
  ${decisionLine}
  Reste immersif et fidele a ton caractere. Reponds en deux ou trois phrases maximum.
  `;

  const aiResponse = await generateGodResponse(userId, chosenGod, aiPrompt);
  return { accepted, aiResponse };
}

export async function resolveFamiliaRole(guildId, guild, chosenGod) {
  const roleId = (await getFamiliaRoleId(guildId, chosenGod).catch(() => null)) || rolesData.roles[chosenGod];
  if (!roleId) return null;
  let role = guild.roles.cache.get(roleId);
  if (!role) {
    role = await guild.roles.fetch(roleId).catch(() => null);
  }
  if (!role) return null;
  return { roleId, role };
}

export async function sendJoinWelcomeAndWeaponPicker({
  guild,
  chosenGod,
  familiaName,
  userMention,
  characterName,
  userId,
}) {
  const discussionChannelId =
    (await getFamiliaChannelId(guild.id, chosenGod, "discussion").catch(() => null)) ||
    generalChannelsData.generalChannels[chosenGod];
  if (!discussionChannelId) return { postedInFamiliaChannel: false };

  const discussionChannel = await guild.channels.fetch(discussionChannelId).catch(() => null);
  if (!discussionChannel || !discussionChannel.isTextBased()) {
    return { postedInFamiliaChannel: false };
  }

  await discussionChannel.send(
    familiaView.buildJoinWelcomeEmbed({ familiaName, userMention, characterName })
  );

  const weapons = filterStartingWeapons(await listWeapons(500).catch(() => []));
  if (weapons.length) {
    const row = familiaView.buildStartingWeaponRow({ userId, weapons });
    await discussionChannel.send({
      content: `${userMention} choisis maintenant ton arme de depart (tu ne peux le faire qu'une seule fois).`,
      components: [row],
    });
  }

  return { postedInFamiliaChannel: true, discussionChannelId };
}

