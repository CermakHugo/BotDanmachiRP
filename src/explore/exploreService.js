import { groupSearches } from "../group/groupService.js";
import * as MonsterService from "../monster/MonsterService.js";
import { generateGodResponse } from "../../handlers/godHandler.js";
import gods from "../../data/gods.js";
import floors from "../../data/floors.js";
import exploreActionKeywords from "../../data/exploreActionKeywords.js";
import { trimToSentence } from "../message/stringTroncate.js";
import * as exploreRoute from "./exploreRoute.js";
import * as groupService from "../group/groupService.js";
import * as BossRoute from "../boss/bossRoute.js";

const FALLBACK_LOOT = [
  { type: "money", min: 25, max: 60, description: "trouve des morceaux de monnaie scintillante" },
  { type: "item", name: "Cristal terne", quantity: 1, description: "recupere un petit cristal terne", data: { rarity: "commun", type: "materiau" } },
  { type: "item", name: "Herbe aromatique", quantity: 1, description: "cueille une herbe aromatique", data: { type: "consommable", heal: 5 } },
];

function normalize(str) {
  return (str || "").toLowerCase().trim();
}

function normalizeForKeywordMatch(str) {
  return (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['�]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMappedKeyword(text, keywords = []) {
  if (!text || !Array.isArray(keywords) || !keywords.length) return false;
  for (const keyword of keywords) {
    const probe = normalizeForKeywordMatch(keyword);
    if (!probe) continue;
    if (probe.includes(" ")) {
      if (text.includes(probe)) return true;
      continue;
    }
    const singleWord = new RegExp(`\\b${probe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (singleWord.test(text)) return true;
  }
  return false;
}

function normalizeGodKey(rawKey) {
  const key = normalize(rawKey || "hestia");
  return gods[key] ? key : "hestia";
}

function displayGodName(key) {
  const safe = normalizeGodKey(key);
  return safe.charAt(0).toUpperCase() + safe.slice(1);
}

function getGodPersonality(key) {
  const safe = normalizeGodKey(key);
  const description = gods[safe]?.description || "";
  return description.trim();
}

function getFloorData(floorNumber) {
  const num = Number(floorNumber) || 0;
  if (num <= 0) {
    return { floorMin: 0, floorMax: 0, description: "Sortie du donjon, proche de la surface." };
  }
  return floors.find((floor) => floor.floorMin <= num && floor.floorMax >= num) || null;
}

function getFloorDescription(floorNumber) {
  const floor = getFloorData(floorNumber);
  return floor?.description || "Le decor change de facon imprevisible, comme si le donjon respirait.";
}

async function resolveLootApi() {
  try {
    const mod = await import("../loot/loot.js");
    return mod;
  } catch {
    return null;
  }
}

async function grantLootToMembers(memberIds, { floor = 1, source = null, sessionId = null, action = null, monsterId = null, monsterName = null } = {}) {
  const lootApi = await resolveLootApi();
  if (lootApi?.grantLootToMembers) {
    return lootApi.grantLootToMembers(memberIds, { floor, source, sessionId, action, monsterId, monsterName });
  }

  const { addMoney, addItem } = await import("../inventory/inventoryService.js");
  const rewards = [];
  for (const memberId of memberIds) {
    const entry = FALLBACK_LOOT[Math.floor(Math.random() * FALLBACK_LOOT.length)];
    if (entry.type === "money") {
      const amount = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
      await addMoney(memberId, amount);
      rewards.push({ memberId, summary: `recoit ${amount} valis et ${entry.description}.` });
    } else {
      await addItem(memberId, entry.name, entry.quantity || 1, entry.data || null);
      rewards.push({ memberId, summary: `${entry.description || "trouve un objet"} (${entry.name}).` });
    }
  }
  return rewards;
}

async function grantLootToCharacter(memberId, { floor = 1, source = null, sessionId = null, action = null, monsterId = null, monsterName = null } = {}) {
  const lootApi = await resolveLootApi();
  if (lootApi?.grantLootToCharacter) {
    return lootApi.grantLootToCharacter(memberId, { floor, source, sessionId, action, monsterId, monsterName });
  }
  const rewards = await grantLootToMembers([memberId], { floor });
  const first = rewards[0];
  return { summary: first?.summary || "trouve quelque chose." };
}

async function pickRandomMonster(floor) {
  const candidates = await MonsterService.getMonsterInFloor(floor);
  const fallback = candidates?.length ? candidates : await MonsterService.getAllMonsters();
  if (!fallback?.length) {
    return {
      id: "inconnu",
      name: "Monstre inconnu",
      level: 1,
      attack: 10,
      hp: 50,
      image: null,
      description: "",
    };
  }

  const model = fallback[Math.floor(Math.random() * fallback.length)];
  const status = await MonsterService.getLastStatus(model).catch(() => null);
  const strength = Number(status?.strength || 10);
  const level = Number(model.level || 1);
  const attack = Math.max(1, Math.floor(strength * 0.4 + level));
  const hp = Number(model.health || model.maxHealth || 50);

  return {
    id: model.monsterId,
    name: model.name,
    level,
    attack,
    hp,
    image: model.appearance || null,
    description: model.description || "",
  };
}

async function getSpawnedBossEncounter(floor) {
  const boss = await BossRoute.getSpawnedBossByFloor(floor).catch(() => null);
  if (!boss) return null;
  return {
    id: boss.bossId,
    name: boss.name,
    level: "BOSS",
    attack: null,
    hp: null,
    image: boss.image || null,
    description: boss.description || "",
    isBoss: true,
  };
}

export async function getExplorationContext(userId) {
  const character = await exploreRoute.findCharacterByUserId(userId);
  if (!character) {
    throw new Error("Tu dois creer un personnage avant d'explorer.");
  }

  const session = Object.values(groupSearches).find(
    (entry) => entry.isFinalized && entry.members?.some((member) => member.id === userId)
  );

  const stateKey = session?.id || userId;
  const memberIds = session
    ? session.members
        .filter((member) => member.status === "leader" || member.status === "accepted")
        .map((member) => member.id)
    : [userId];

  return {
    userId,
    character,
    session,
    sessionId: session?.id || null,
    stateKey,
    memberIds,
  };
}

function buildGodNarrationPrompt(godKey, content) {
  const narrator = displayGodName(godKey);
  const description = getGodPersonality(godKey);

  return [
    `Tu es ${narrator}, une divinit� de DanMachi, narrateur omniscient au ton divin.`,
    description ? `Personnalit� et mani�re de penser : ${description}` : null,

    // Objectif clair
    "Objectif : raconter pr�cis�ment les actions du joueur (� la troisi�me personne) tout en faisant sentir clairement et en permanence que l'observateur est la divinit� du joueur.",

    // Structure oblig�e (tr�s efficace)
    "Structure recommand�e pour chaque moment important : (1) Action/choix du joueur (3e personne) ? (2) cons�quence imm�diate ? (3) lecture divine : jugement, �motion, pr�sage, ou remarque sur le destin.",

    // Empreinte divine obligatoire
    `Empreinte divine obligatoire : � intervalles r�guliers, ajoute des marqueurs d'observation et de divinit� (destin, fil, caprices du donjon, vue depuis les hauteurs, amusement/irritation/fiert� de ${narrator}), sans jamais signer ni mettre de tag.`,
    "Tu peux ins�rer de courtes incises de narrateur � la premi�re personne (ex: 'Je le vois', 'Je p�se ce choix') mais sans jamais t'adresser directement au joueur.",

    // R�gles de style
    "Reste immersif. Pas de liste, pas de m�ta-explication.",
    "�vite les dialogues entre guillemets. Si n�cessaire, fais du discours indirect (ex: 'il murmure qu'il...').",
    "Ne dis jamais 'tu' ou 'ton'. Parle du joueur comme 'l'aventurier', 'l'enfant', 'le mortel', ou par son nom si fourni.",
    `Le style doit refl�ter ${narrator} : vocabulaire, valeurs, rythme, m�taphores (selon sa personnalit�).`,

    content,
  ]
    .filter(Boolean)
    .join(" ");
}


function decideAction(content) {
  const raw = (content || "").toString();
  const text = normalize(raw);
  const normalizedKeywordText = normalizeForKeywordMatch(raw);
  if (!text) return "roleplay";

  // Evite que des questions declenchent une action (ex: "tu veux descendre ?").
  // On exige une formulation "action" explicite (declaration ou imperatif), sans point d'interrogation.
  const isQuestion =
    raw.includes("?") ||
    /(^|\s)(tu|vous|on|nous)\s+(veux|veut|voulez|veulent|peux|peut|pouvez|peuvent|pense|penses|pensez|souhaites|souhaite|souhaitez)\b/i.test(
      raw
    );
  if (isQuestion) return "roleplay";

  // Cas court utilise par les joueurs: "sort" (sans contexte de sortilege) => sortie.
  if (/^sort[\s.!?]*$/i.test(normalizedKeywordText)) {
    return "exit";
  }

  if (hasMappedKeyword(normalizedKeywordText, exploreActionKeywords.exit)) {
    return "exit";
  }

  if (hasMappedKeyword(normalizedKeywordText, exploreActionKeywords.descend)) {
    return "descend";
  }

  if (hasMappedKeyword(normalizedKeywordText, exploreActionKeywords.ascend)) {
    return "ascend";
  }

  if (hasMappedKeyword(normalizedKeywordText, exploreActionKeywords.mine)) {
    return "mine";
  }
  if (hasMappedKeyword(normalizedKeywordText, exploreActionKeywords.search)) {
    return "search";
  }
  if (hasMappedKeyword(normalizedKeywordText, exploreActionKeywords.forage)) {
    return "forage";
  }

  return "roleplay";
}

function isLootAction(action) {
  return action === "search" || action === "mine" || action === "forage";
}

function ensureExpeditionState(session) {
  session.expeditionFloor = Number.isFinite(session.expeditionFloor) ? session.expeditionFloor : 0;
  session.expeditionCooldowns = session.expeditionCooldowns || {};
  return session;
}

function isOnCooldown(session, userId, cooldownMs) {
  const last = session.expeditionCooldowns?.[userId] || 0;
  return Date.now() - last < cooldownMs;
}

function stampCooldown(session, userId) {
  session.expeditionCooldowns[userId] = Date.now();
}

function getEncounterChances(floor, action) {
  const depth = Math.max(0, Number(floor) || 0);
  const baseLoot = Math.min(0.7, 0.25 + depth * 0.04);

  if (action === "exit") return { monster: 0, loot: 0 };

  const monster =
    action === "descend" ? 0.65 :
    action === "ascend" ? 0.35 :
    0.5;

  if (action === "search") {
    return { monster, loot: Math.min(0.85, baseLoot + 0.15) };
  }
  if (action === "mine") {
    return { monster, loot: Math.min(0.85, baseLoot + 0.1) };
  }
  if (action === "forage") {
    return { monster, loot: Math.min(0.8, baseLoot + 0.05) };
  }
  return { monster, loot: 0 };
}

async function fetchRecentUserMessages(channel, limit = 16) {
  if (!channel?.isTextBased?.()) return "";
  const messages = await channel.messages.fetch({ limit }).catch(() => null);
  if (!messages) return "";
  const lines = Array.from(messages.values())
    .filter((m) => !m.author?.bot)
    .reverse()
    .slice(-8)
    .map((m) => `${m.author?.username || "joueur"}: ${m.content}`.slice(0, 180));
  return lines.join("\n");
}

export async function buildExpeditionChatOutcome(message, session) {
  await ensureExpeditionState(session);
  const userId = message.author.id;

  if (isOnCooldown(session, userId, 10_000)) {
    return {
      type: "cooldown",
      floor: session.expeditionFloor,
      narration: "Patiente un instant avant une nouvelle action.",
      authorId: userId,
    };
  }
  stampCooldown(session, userId);

  const character = await exploreRoute.findCharacterByUserId(userId);
  if (!character) {
    return {
      type: "error",
      floor: session.expeditionFloor,
      narration: "Tu dois creer un personnage avant de partir en expedition.",
      authorId: userId,
    };
  }

  const godKey = await normalizeGodKey(character.familia);

  const action = decideAction(message.content);
  if (action === "exit") {
    if (session.expeditionFloor !== 0) {
      return {
        type: "error",
        floor: session.expeditionFloor,
        narration: "Pour sortir du donjon, il faut etre a l'etage 0.",
        authorId: userId,
      };
    }
    const recent = await fetchRecentUserMessages(message.channel);
    const background = getFloorDescription(0);
    const promptParts = [
      buildGodNarrationPrompt(godKey, `Contexte expedition: sortie du donjon (etage 0). Decor: ${background}`),
      (recent) ? `Derniers messages:\n${recent}` : null,
      `Action du joueur (${character.name}): ${message.content}`,
      "Ce qui arrive:\n- Le groupe sort du donjon (etage 0).",
      "Narre la scene en 2 a 4 phrases, immersif, sans liste.",
    ].filter(Boolean);

    const narration = trimToSentence(
      await generateGodResponse(userId, godKey, promptParts.join("\n\n"), 160),
      350
    );

    await exploreRoute
      .createExplorationLog({
        userId,
        sessionId: session?.id ?? null,
        floor: 0,
        action: "exit",
        mode: "expedition",
        monsterName: null,
        lootSummary: null,
        userText: message.content ?? null,
        narration,
      })
      .catch(() => {});

    return {
      type: "exit",
      floor: 0,
      action: "exit",
      monster: null,
      loot: null,
      fightContext: null,
      narration: null,
      authorId: userId,
      characterName: character.name,
      godKey,
    };
  }

  const move = action === "descend" ? 1 : action === "ascend" ? -1 : 0;
  const nextFloor = Math.max(0, session.expeditionFloor + move);
  session.expeditionFloor = nextFloor;

  character.floor = nextFloor;
  await exploreRoute.saveCharacter(character).catch(() => {});

  const chances =  getEncounterChances(nextFloor, action);
  
  const loot =
    (isLootAction(action) && Math.random() <= chances.loot)
      ? await grantLootToCharacter(userId, {
          floor: Math.max(1, nextFloor),
          source: "exploration",
          sessionId: session?.id ?? null,
          action,
        })
      : null;
  const recent = await fetchRecentUserMessages(message.channel);
  const background = getFloorDescription(nextFloor);

  const outcomeLines = [];
  if (move !== 0) {
    outcomeLines.push(move > 0 ? `Le groupe descend a l'etage ${nextFloor}.` : `Le groupe remonte a l'etage ${nextFloor}.`);
  }
  if (loot?.summary) {
    outcomeLines.push(`Butin: ${loot.summary}.`);
  } else if (isLootAction(action)) {
    outcomeLines.push("Butin: rien de notable cette fois.");
  } else {
    outcomeLines.push("Butin: aucun (il faut fouiller / miner / recolter pour trouver quelque chose).");
  }

  const promptParts = [
    buildGodNarrationPrompt(godKey, `Contexte expedition: etage ${nextFloor} (0 = sortie). Decor: ${background}`),
    recent ? `Derniers messages:\n${recent}` : null,
    `Action du joueur (${character.name}): ${message.content}`,
    "Regle: un butin ne peut etre trouve que lors d'une action de fouille / recherche / minage / recolte.",
    `Ce qui arrive:\n- ${outcomeLines.join("\n- ")}`,
    "Narre l'action et ses consequences en 2 a 4 phrases, immersif, sans liste.",
  ].filter(Boolean);

  const narration = trimToSentence(
    await generateGodResponse(userId, godKey, promptParts.join("\n\n"), 200),
    350
  );

  if(nextFloor > 0 && Math.random() <= chances.monster){
    const bossEncounter = await getSpawnedBossEncounter(nextFloor);
    return {
    type: "fight",
    floor: character.floor,
    action,
    monster : bossEncounter,
    loot : null,
    fightContext: null,
    narration,
    authorId: userId,
    characterName: character.name,
    godKey,
  };
  }

  exploreRoute
    .createExplorationLog({
      userId,
      sessionId: session?.id ?? null,
      floor: nextFloor,
      action,
      mode: "expedition",
      monsterName: null,
      lootSummary: loot?.summary ?? null,
      userText: message.content ?? null,
      narration,
    })
    .catch(() => {});

  return {
    type: "expedition",
    floor: nextFloor,
    action,
    monster : null,
    loot,
    fightContext: null,
    narration,
    authorId: userId,
    characterName: character.name,
    godKey,
  };
}

function getActiveSessionMemberIds(session) {
  return (session?.members || [])
    .filter((m) => m.status === "leader" || m.status === "accepted")
    .map((m) => m.id);
}

async function getEligibleSessionMemberIds(session) {
  const memberIds = getActiveSessionMemberIds(session);
  if (!memberIds.length) return [];

  const characters = await Promise.all(
    memberIds.map((id) => exploreRoute.findCharacterByUserId(id).catch(() => null))
  );

  return memberIds.filter((id, index) => {
    const character = characters[index];
    return Boolean(character && !character.isDead);
  });
}

function ensureTurnState(session) {
  session.expeditionTurn = session.expeditionTurn || { actions: {} };
  session.expeditionTurn.actions = session.expeditionTurn.actions || {};
  return session.expeditionTurn;
}

function summarizeActionForRecap(action) {
  switch (action) {
    case "descend": return "veut descendre";
    case "ascend": return "veut monter";
    case "search": return "fouille les environs";
    case "mine": return "tente de miner";
    case "forage": return "cherche des ressources";
    case "exit": return "veut sortir du donjon";
    default: return "agit sur place";
  }
}

function resolveMovementAction(actions) {
  const unique = [...new Set(actions.filter((a) => ["descend", "ascend", "exit"].includes(a)))];
  if (!unique.length) return { action: null, note: "Aucun deplacement ce tour." };
  if (unique.includes("descend") && unique.includes("ascend")) {
    return { action: null, note: "Les intentions de deplacement se contredisent (monter/descendre), le groupe reste sur place." };
  }
  if (unique.includes("descend")) return { action: "descend", note: null };
  if (unique.includes("ascend")) return { action: "ascend", note: null };
  if (unique.includes("exit")) return { action: "exit", note: null };
  return { action: null, note: "Aucun deplacement ce tour." };
}

function getGroupMonsterChance(roundActions, floor) {
  if ((Number(floor) || 0) <= 0) return 0;
  const actions = Object.values(roundActions || {})
    .map((payload) => payload?.action)
    .filter(Boolean);
  if (!actions.length) return 0;

  if (actions.includes("descend")) return 0.65;
  if (actions.includes("ascend")) return 0.35;
  if (actions.some((action) => action !== "exit")) return 0.5;
  return 0;
}

async function narrateMemberTurnAction({ userId, character, floor, payload, actionResult }) {
  const godKey = normalizeGodKey(character?.familia);
  const floorDescription = getFloorDescription(floor);
  const prompt = [
    buildGodNarrationPrompt(
      godKey,
      `Contexte expedition: etage ${floor}. Decor: ${floorDescription}`
    ),
    `Aventurier: ${character?.name || "Inconnu"}.`,
    `Action ecrite: ${payload?.content || "Aucune action ecrite."}`,
    `Action interpretee: ${payload?.action || "roleplay"}.`,
    `Resolution: ${actionResult || "Aucun effet notable."}`,
    "Narre en 1 ou 2 phrases maximum, immersif, voix de la divinite du joueur.",
  ].join("\n\n");

  try {
    const text = await generateGodResponse(userId, godKey, prompt, 90);
    return trimToSentence(text, 220);
  } catch {
    return `${character?.name || "L'aventurier"} agit avec prudence, observe par sa divinite.`;
  }
}

async function narrateEncounterIntro({ userId, character, floor, monster = null, roundActions = {} }) {
  const godKey = normalizeGodKey(character?.familia);
  const floorDescription = getFloorDescription(floor);
  const actionsSummary = Object.entries(roundActions)
    .map(([id, payload]) => `- ${id}: ${payload?.content || payload?.action || "agit"}`)
    .slice(0, 6)
    .join("\n");
  const foeLine = monster?.isBoss
    ? `Un BOSS apparait: ${monster?.name || "Boss inconnu"}.`
    : "Une rencontre hostile eclate dans les couloirs.";

  const prompt = [
    buildGodNarrationPrompt(
      godKey,
      `Contexte expedition: etage ${floor}. Decor: ${floorDescription}`
    ),
    `Aventurier observe: ${character?.name || "Inconnu"}.`,
    foeLine,
    actionsSummary ? `Actions du groupe juste avant la rencontre:\n${actionsSummary}` : null,
    "Ecris 2 phrases courtes, epiques et immersives, qui annoncent l'ouverture du combat sans meta.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    return trimToSentence(await generateGodResponse(userId, godKey, prompt, 90), 260);
  } catch {
    return monster?.isBoss
      ? `Le donjon tremble: ${monster?.name || "un Boss"} s'avance, imposant un combat sans retour.`
      : "Un souffle hostile fend la pierre; le combat devient inevitable.";
  }
}

async function resolveTurnRecap(message, session, roundActions) {
  const processingMessage = await message.reply("Le bot reflechit... narration du tour en cours.").catch(() => null);
  const memberIds = await getEligibleSessionMemberIds(session);
  const characters = await Promise.all(memberIds.map((id) => exploreRoute.findCharacterByUserId(id)));
  const byId = new Map(characters.filter(Boolean).map((c) => [c.userId, c]));

  const floor = Number.isFinite(session.expeditionFloor) ? session.expeditionFloor : 0;
  const recapLines = [];
  const lootLines = [];
  const divineNarrations = [];
  let fightTriggered = false;
  let bossEncounter = null;
  let triggerUserId = null;
  const groupMonsterChance = getGroupMonsterChance(roundActions, floor);
  const groupMonsterTriggered = groupMonsterChance > 0 && Math.random() <= groupMonsterChance;

  for (const [userId, payload] of Object.entries(roundActions)) {
    recapLines.push(`- <@${userId}> ${summarizeActionForRecap(payload.action)}`);
  }

  // 1) Actions sur place d'abord
  for (const userId of memberIds) {
    const payload = roundActions[userId];
    if (!payload) continue;

    const action = payload.action;
    const character = byId.get(userId);
    if (!character) continue;

    let actionResult = "Aucun effet notable.";

    const chances = getEncounterChances(floor, action);
    if (action !== "exit" && floor > 0 && groupMonsterTriggered) {
      bossEncounter = bossEncounter || await getSpawnedBossEncounter(floor);
      fightTriggered = true;
      if (!triggerUserId && action !== "exit") triggerUserId = userId;
      actionResult = "Declenche une rencontre monstre. Le groupe est bloque.";
      if (bossEncounter?.isBoss && !lootLines.some((line) => line.includes("BOSS"))) {
        lootLines.push(`- <@${userId}> voit surgir **${bossEncounter.name}**, un BOSS !`);
      } else if (!bossEncounter?.isBoss && !lootLines.some((line) => line.includes("tombe sur un monstre"))) {
        lootLines.push(`- <@${userId}> tombe sur un monstre !`);
      }
      const narration = await narrateMemberTurnAction({ userId, character, floor, payload, actionResult });
      divineNarrations.push(`- <@${userId}> ${narration}`);
      continue;
    }

    if (isLootAction(action)) {
      if (Math.random() <= chances.loot) {
        const loot = await grantLootToCharacter(userId, {
          floor: Math.max(1, floor),
          source: "exploration",
          sessionId: session?.id ?? null,
          action,
        });
        actionResult = loot?.summary || "trouve quelque chose.";
        lootLines.push(`- <@${userId}>: ${actionResult}`);
      } else {
        actionResult = "Ne trouve rien.";
        lootLines.push(`- <@${userId}>: ne trouve rien.`);
      }
    }

    if (action === "descend") actionResult = "Se prepare a descendre avec le groupe.";
    if (action === "ascend") actionResult = "Se prepare a remonter avec le groupe.";
    if (action === "exit") actionResult = "Souhaite sortir du donjon.";

    const narration = await narrateMemberTurnAction({ userId, character, floor, payload, actionResult });
    divineNarrations.push(`- <@${userId}> ${narration}`);

    await exploreRoute.createExplorationLog({
      userId,
      sessionId: session?.id ?? null,
      floor,
      action,
      mode: "expedition",
      monsterName: null,
      lootSummary: null,
      userText: payload.content ?? null,
      narration,
    }).catch(() => {});
  }

  // 2) Deplacement ensuite
  let nextFloor = floor;
  let movementNote = null;
  if (fightTriggered) {
    movementNote = "Le groupe est bloque par une rencontre hostile: combat obligatoire.";
  } else {
    const move = resolveMovementAction(Object.values(roundActions).map((p) => p.action));
    movementNote = move.note;

    if (move.action === "descend") nextFloor = Math.max(0, floor + 1);
    if (move.action === "ascend") nextFloor = Math.max(0, floor - 1);
    if (move.action === "exit") {
      if (floor === 0) {
        return {
          type: "exit",
          floor,
          recapLines,
          lootLines,
          divineNarrations,
          movementNote: "Le groupe quitte le donjon.",
          processingMessage,
        };
      }
      movementNote = "Impossible de sortir: il faut etre a l'etage 0.";
    }
  }

  if (nextFloor !== floor) {
    for (const character of characters.filter(Boolean)) {
      character.floor = nextFloor;
      await exploreRoute.saveCharacter(character).catch(() => {});
    }
    session.expeditionFloor = nextFloor;
    await groupService.setExpeditionFloor(session.id, nextFloor).catch(() => {});
  }

  if (fightTriggered) {
    const triggerCharacter = byId.get(triggerUserId) || characters.find(Boolean) || null;
    const encounterNarration = await narrateEncounterIntro({
      userId: triggerUserId || memberIds[0],
      character: triggerCharacter,
      floor: nextFloor,
      monster: bossEncounter,
      roundActions,
    });

    await groupService.setExpeditionFightLocked(session.id, true).catch(() => {});
    return {
      type: "fight",
      floor: nextFloor,
      recapLines,
      lootLines,
      divineNarrations,
      movementNote,
      monster: bossEncounter,
      encounterNarration,
      processingMessage,
    };
  }

  return {
    type: "expedition_turn",
    floor: nextFloor,
    recapLines,
    lootLines,
    divineNarrations,
    movementNote,
    processingMessage,
  };
}

export async function handleGroupExpeditionMessage(message, session) {
  ensureExpeditionState(session);

  if (session.expeditionFightLocked) {
    return { type: "ignored_fight" };
  }

  const userId = message.author.id;
  const memberIds = await getEligibleSessionMemberIds(session);
  if (!memberIds.includes(userId)) return { type: "ignored" };

  const character = await exploreRoute.findCharacterByUserId(userId);
  if (!character) return { type: "error", message: "Tu dois creer un personnage avant d'explorer." };
  if (character.isDead) return { type: "dead" };

  const turn = ensureTurnState(session);
  if (turn.actions[userId]) {
    return { type: "ignored_duplicate" };
  }

  turn.actions[userId] = {
    userId,
    content: message.content,
    action: decideAction(message.content),
  };

  const waitingFor = memberIds.filter((id) => !turn.actions[id]);
  if (waitingFor.length > 0) {
    return { type: "waiting", waitingFor };
  }

  const roundActions = { ...turn.actions };
  session.expeditionTurn = { actions: {} };
  return resolveTurnRecap(message, session, roundActions);
}

