import { randomUUID } from "crypto";
import * as groupRoute from "./groupRoute.js";

// Memoire vive des groupes en attente d'ecriture en base.
export const groupSearches = {};

const HEAL_AFTER_MS = 3_600_000; // 1h (doit matcher CharacterService.startHealthRegenJob par defaut)

function formatRemainingMs(ms) {
  const safe = Math.max(0, Number(ms) || 0);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}min ${seconds}s`;
}

function getRemainingReviveMs(character) {
  const last = character?.lastDamageAt ? new Date(character.lastDamageAt).getTime() : null;
  if (!last) return HEAL_AFTER_MS;
  return (last + HEAL_AFTER_MS) - Date.now();
}

function findExistingDraft(leaderId) {
  return Object.values(groupSearches).find((entry) => entry.leaderId === leaderId && !entry.isFinalized);
}

export function findSessionById(sessionId) {
  return groupSearches[sessionId];
}

export function findSessionByMessage(messageId) {
  return Object.values(groupSearches).find((entry) => entry.leaderMessageId === messageId);
}

export function findFinalizedSessionByLeader(leaderId) {
  return Object.values(groupSearches).find((entry) => entry.leaderId === leaderId && entry.isFinalized);
}

export function findSessionByGroupId(groupId) {
  return Object.values(groupSearches).find((entry) => String(entry.dbGroupId) === String(groupId));
}

export function findSessionByExpeditionTextChannel(channelId) {
  return Object.values(groupSearches).find((entry) => entry.expeditionTextChannelId === channelId);
}

function buildHydratedSessionFromGroup(group) {
  if (!group) return null;
  const sessionId = `group-${group.groupId}`;
  const existing = groupSearches[sessionId];
  const members = (group.Characters || [])
    .map((c) => ({ id: c.userId || c.characterId, status: (c.userId || c.characterId) === group.leader ? "leader" : "accepted" }))
    .filter((m) => Boolean(m.id));

  const session = existing || {
    id: sessionId,
    guildId: null,
    channelId: null,
    leaderMessageId: null,
    embed: null,
    invitedUserIds: [],
    rejoinableUserIds: [],
  };

  session.dbGroupId = group.groupId;
  session.leaderId = group.leader;
  session.name = group.name || "Groupe";
  session.description = group.description || "";
  session.visibility = group.visibility || "open";
  session.isFinalized = true;
  session.members = members;
  session.expeditionFloor = Number.isFinite(group.expeditionFloor) ? group.expeditionFloor : 0;
  session.expeditionFightLocked = Boolean(group.expeditionFightLocked);
  session.expeditionTextChannelId = group.expeditionTextChannelId || null;
  session.expeditionVoiceChannelId = group.expeditionVoiceChannelId || null;
  session.expeditionTurn = session.expeditionTurn || null;

  groupSearches[sessionId] = session;
  return session;
}

export async function findOrHydrateSessionByExpeditionTextChannel(channelId) {
  const inMemory = findSessionByExpeditionTextChannel(channelId);
  if (inMemory) return inMemory;

  const group = await groupRoute.getGroupByExpeditionTextChannelId(channelId);
  if (!group) return null;
  return buildHydratedSessionFromGroup(group);
}

export async function getGroupByLeaderId(leaderId){
  return await groupRoute.getGroupByLeaderId(leaderId)
}

function ensureSession(sessionId) {
  const session = findSessionById(sessionId);
  if (!session) {
    throw new Error("Ce groupe n'existe pas ou a deja ete dissout.");
  }
  return session;
}

function ensureLeader(session, userId) {
  if (session.leaderId !== userId) {
    throw new Error("Seul le leader peut effectuer cette action.");
  }
}

function removeFromList(list, value) {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item !== value);
}

// Creation d'une annonce en memoire avant validation.
export async function createRecruitmentSession({ guildId, leaderId, name, description, visibility }) {
  const leaderCharacter = await groupRoute.getCharacterById(leaderId);
  if (!leaderCharacter) {
    throw new Error("Tu dois creer ton personnage avant de lancer un recrutement.");
  }
  if (leaderCharacter.isDead) {
    const remaining = formatRemainingMs(getRemainingReviveMs(leaderCharacter));
    throw new Error(`Tu es KO. Tu pourras rejouer dans ${remaining}.`);
  }

  if (findExistingDraft(leaderId)) {
    throw new Error("Tu as deja une annonce de groupe active.");
  }

  if (findFinalizedSessionByLeader(leaderId)) {
    throw new Error("Tu as deja une expedition en cours.");
  }

  if (leaderCharacter.groupId) {
    const currentGroup = await groupRoute.getGroupByPk(leaderCharacter.groupId).catch(() => null);
    if (currentGroup) {
      throw new Error("Tu es deja en expedition. Termine-la avant d'en creer une autre.");
    }
  }

  const existingLeaderGroup = await groupRoute.getGroupByLeaderId(leaderId).catch(() => null);
  if (existingLeaderGroup) {
    const hasExpeditionState = Boolean(
      existingLeaderGroup.expeditionTextChannelId ||
      existingLeaderGroup.expeditionVoiceChannelId ||
      existingLeaderGroup.expeditionFightLocked ||
      Number(existingLeaderGroup.expeditionFloor || 0) > 0
    );

    if (hasExpeditionState) {
      throw new Error("Tu as deja une expedition active.");
    }
  }

  const sessionId = randomUUID();
  groupSearches[sessionId] = {
    id: sessionId,
    guildId,
    leaderId,
    name: name || "Groupe sans nom",
    description: description || "Aucune description.",
    visibility: visibility || "open",
    members: [{ id: leaderId, status: "leader" }],
    isFinalized: false,
    channelId: null,
    leaderMessageId: null,
    embed: null,
    familia: leaderCharacter.familia || null,
    dbGroupId: null,
    expeditionTextChannelId: null,
    expeditionVoiceChannelId: null,
    invitedUserIds: [],
    rejoinableUserIds: [],
  };
  return groupSearches[sessionId];
}

export function attachMessageToSession(sessionId, message, embedPayload) {
  const session = ensureSession(sessionId);
  session.channelId = message.channel?.id || message.channelId;
  session.leaderMessageId = message.id;
  session.embed = embedPayload;
  return session;
}

export function getMemberLists(session) {
  const leader = session.members.filter((m) => m.status === "leader");
  const accepted = session.members.filter((m) => m.status === "accepted");
  const pending = session.members.filter((m) => m.status === "pending");
  return { leader, accepted, pending };
}

export async function getMembers(group){
  return await groupRoute.getGroupMembers(group);
}

export async function getGroupById(groupId){
  return await groupRoute.getGroupByPk(groupId)
}

function memberExists(session, userId) {
  return session.members.some((member) => member.id === userId);
}

// Ajout d'un joueur: mode recrutement (pending) ou expedition (accepted immediat).
export async function addCandidate(sessionId, userId) {
  const session = ensureSession(sessionId);

  if (memberExists(session, userId)) {
    throw new Error("Tu es deja inscrit dans ce groupe.");
  }

  const applicantCharacter = await groupRoute.getCharacterById(userId);
  if (!applicantCharacter) {
    throw new Error("Tu dois creer ton personnage avant de rejoindre un groupe.");
  }
  if (applicantCharacter.isDead) {
    const remaining = formatRemainingMs(getRemainingReviveMs(applicantCharacter));
    throw new Error(`Tu es KO. Tu pourras rejoindre un groupe dans ${remaining}.`);
  }

  session.invitedUserIds = session.invitedUserIds || [];
  const wasInvited = session.invitedUserIds.includes(userId);

  if (session.isFinalized) {
    session.rejoinableUserIds = session.rejoinableUserIds || [];
    const canRejoin = session.rejoinableUserIds.includes(userId);
    if (!canRejoin && !wasInvited) {
      throw new Error("Ce groupe est deja en expedition. Demande une invitation au leader.");
    }

    session.rejoinableUserIds = removeFromList(session.rejoinableUserIds, userId);
    session.invitedUserIds = removeFromList(session.invitedUserIds, userId);
    session.members.push({ id: userId, status: "accepted" });

    if (!session.dbGroupId) {
      throw new Error("Ce groupe n'est pas correctement initialise.");
    }

    await groupRoute.setCharacterGroupId(userId, session.dbGroupId);
    return { session, status: "accepted" };
  }

  if (!wasInvited && session.visibility === "closed") {
    throw new Error("Ce groupe est ferme. Demande une invitation au leader.");
  }

  if (!wasInvited && session.visibility === "familia" && session.familia) {
    const applicant = applicantCharacter;
    if (!applicant || applicant.familia !== session.familia) {
      throw new Error("Ce groupe est reserve a ta familia.");
    }
  }

  if (wasInvited) {
    session.invitedUserIds = removeFromList(session.invitedUserIds, userId);
  }
  session.members.push({ id: userId, status: "pending" });
  return { session, status: "pending" };
}

// Quitter un groupe et stocker l'info pour un retour rapide pendant l'expedition.
export async function leaveSession(sessionId, userId) {
  const session = ensureSession(sessionId);
  const memberIndex = session.members.findIndex((m) => m.id === userId);
  if (memberIndex === -1) {
    throw new Error("Tu n'es pas inscrit dans ce groupe.");
  }

  const member = session.members[memberIndex];
  if (member.status === "leader") {
    throw new Error("Impossible d'utiliser cette action pour le leader.");
  }

  session.members.splice(memberIndex, 1);

  if (session.isFinalized && session.dbGroupId) {
    await groupRoute.clearCharacterGroupId(userId, session.dbGroupId);
    session.rejoinableUserIds = session.rejoinableUserIds || [];
    if (!session.rejoinableUserIds.includes(userId)) {
      session.rejoinableUserIds.push(userId);
    }
  }

  return { session, removed: member };
}

export async function excludeMember(sessionId, leaderId, targetId) {
  const session = ensureSession(sessionId);
  ensureLeader(session, leaderId);

  const memberIndex = session.members.findIndex((m) => m.id === targetId);
  if (memberIndex === -1) {
    throw new Error("Ce joueur n'est pas dans la liste.");
  }

  const target = session.members[memberIndex];
  if (target.status === "leader") {
    throw new Error("Impossible d'exclure le leader.");
  }

  session.members.splice(memberIndex, 1);

  if (session.isFinalized && session.dbGroupId) {
    await groupRoute.clearCharacterGroupId(targetId, session.dbGroupId);
  }

  return { session, removed: target };
}

// Invitation forcee par le leader, meme si le groupe est ferme/familia.
export async function inviteMember(sessionId, leaderId, targetId) {
  const session = ensureSession(sessionId);
  ensureLeader(session, leaderId);

  if (memberExists(session, targetId)) {
    throw new Error("Ce joueur est deja dans la liste.");
  }

  const targetCharacter = await groupRoute.getCharacterById(targetId);
  if (!targetCharacter) {
    throw new Error("Ce joueur n'a pas encore de personnage.");
  }
  if (targetCharacter.isDead) {
    const remaining = formatRemainingMs(getRemainingReviveMs(targetCharacter));
    throw new Error(`Ce joueur est KO. Il pourra rejouer dans ${remaining}.`);
  }

  session.invitedUserIds = session.invitedUserIds || [];
  if (!session.invitedUserIds.includes(targetId)) {
    session.invitedUserIds.push(targetId);
  }

  // IMPORTANT: une invitation ne doit pas inscrire le joueur automatiquement.
  // Le joueur doit cliquer sur "Rejoindre" pour etre ajoute (pending/accepted selon etat du groupe).
  return { session, status: "invited" };
}

// Passage en expedition: creation DB + bascule des etats membres.
export async function validateSession(sessionId, leaderId) {
  const session = ensureSession(sessionId);
  ensureLeader(session, leaderId);

  if (session.isFinalized) {
    throw new Error("Le groupe est deja valide.");
  }

  const memberIds = session.members.map((m) => m.id);

  return groupRoute.withTransaction(async (t) => {
    const group = await groupRoute.createGroup(
      {
        leader: leaderId,
        name: session.name,
        description: session.description,
        visibility: session.visibility,
      },
      { transaction: t }
    );

    await groupRoute.setCharactersGroupId(memberIds, group.groupId, { transaction: t });

    session.isFinalized = true;
    session.dbGroupId = group.groupId;
    session.members = session.members.map((m) => ({
      ...m,
      status: m.status === "leader" ? "leader" : "accepted",
    }));
    session.expeditionFloor = 0;
    session.expeditionFightLocked = false;

    return { group, session };
  });
}

// Dissolution propre du groupe une fois l'expedition terminee.
export async function dissolveSession(sessionId) {
  const session = ensureSession(sessionId);

  if (session.dbGroupId) {
    await groupRoute.clearGroupFromCharacters(session.dbGroupId);
    await groupRoute.deleteGroup(session.dbGroupId);
  }

  delete groupSearches[sessionId];
}

export function getAllSessions() {
  return groupSearches;
}

export function discardSession(sessionId) {
  if (!sessionId) return;
  const session = groupSearches[sessionId];
  if (!session) return;
  if (session.isFinalized) return;
  delete groupSearches[sessionId];
}

export async function setSessionVisibility(sessionId, leaderId, visibility) {
  const session = ensureSession(sessionId);
  ensureLeader(session, leaderId);

  const allowed = new Set(["open", "closed", "familia"]);
  if (!allowed.has(visibility)) {
    throw new Error("Visibilite invalide.");
  }

  session.visibility = visibility;

  if (session.dbGroupId) {
    await groupRoute.updateGroupVisibility(session.dbGroupId, visibility);
  }

  return session;
}

export async function setExpeditionChannels(sessionId, { textChannelId = null, voiceChannelId = null } = {}) {
  const session = ensureSession(sessionId);
  session.expeditionTextChannelId = textChannelId;
  session.expeditionVoiceChannelId = voiceChannelId;

  if (session.dbGroupId) {
    await groupRoute.updateGroupExpeditionState(session.dbGroupId, {
      expeditionTextChannelId: textChannelId,
      expeditionVoiceChannelId: voiceChannelId,
    });
  }
  return session;
}

export async function setExpeditionFightLocked(sessionId, locked) {
  const session = ensureSession(sessionId);
  session.expeditionFightLocked = Boolean(locked);
  if (session.dbGroupId) {
    await groupRoute.updateGroupExpeditionState(session.dbGroupId, {
      expeditionFightLocked: Boolean(locked),
    });
  }
  return session;
}

export async function setExpeditionFightLockedByGroupId(groupId, locked) {
  const session = findSessionByGroupId(groupId);
  if (session) {
    return setExpeditionFightLocked(session.id, locked);
  }

  const group = await groupRoute.getGroupByPkWithMembers(groupId);
  if (!group) return null;
  const hydrated = buildHydratedSessionFromGroup(group);
  return setExpeditionFightLocked(hydrated.id, locked);
}

export async function setExpeditionFloor(sessionId, floor) {
  const session = ensureSession(sessionId);
  const nextFloor = Math.max(0, Number(floor) || 0);
  session.expeditionFloor = nextFloor;
  if (session.dbGroupId) {
    await groupRoute.updateGroupExpeditionState(session.dbGroupId, {
      expeditionFloor: nextFloor,
    });
  }
  return session;
}


