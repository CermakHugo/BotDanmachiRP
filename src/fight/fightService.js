// src/services/combat/combatUtils.js
import * as CharacterService from "../character/CharacterService.js"
import * as MonsterService from "../monster/MonsterService.js"
import * as LootService from "../loot/lootService.js"
import * as FightRoute from "./fightRoute.js";
import * as AIHandler from "../../handlers/aiHandler.js";
import { ActionModel, actionTypes } from "./tools/actionModel.js";
import { Fighter, FighterType } from "./tools/FighterModel.js";
import floorsData from "../../data/floors.js";
import * as CapacityEffectService from "../capacityEffects/capacityEffectService.js"
import * as PendingStatsService from "../pendingStats/PendingStatsService.js"
import * as equipmentService from "../equipment/equipmentService.js";
import * as GuildMissionService from "../guildMission/guildMissionService.js";

const damageType = {
      TAKE: 'TAKE',
      HEAL:'HEAL',
      REDUCE:'REDUCE'
};

const floors = floorsData;

const narrationStyles = {EPIC : "epique", TACTICS : "tactique", CINEMA : "cinematique"}
const narrationLength = {SHORT : "phrase", MEDIUM : "paragraphe", LARGE : "encadrement MJ"}

export function getFloor(floorNumber){
  return floors.find((floor) => {return floor.floorMin <= floorNumber && floor.floorMax >= floorNumber});
}

export function getFloorBackground(floorNumber){
  const floor = getFloor(floorNumber);
  return floor.description;
}

export async function getInitContext(fight, style, length){
  const context = await getFightContext(fight);
  console.log(`Fight Init Context : ${context}`)
  return `Rédige une introduction de combat dans un ton ${style}.
  Contexte : ${context}.
  Format : ${length}.
  Termine sur une phrase qui annonce le début du combat.`
}

function describeVitalState(life, maxLife){
  const max = Math.max(1, Number(maxLife) || 1);
  const current = Math.max(0, Number(life) || 0);
  const ratio = current / max;
  if (ratio <= 0.05) return "a un fil de la mort, corps couvert de plaies ouvertes";
  if (ratio <= 0.12) return "a l'agonie, peine a rester debout";
  if (ratio <= 0.25) return "grievement blesse, saigne abondamment";
  if (ratio <= 0.4) return "tres entame, gestes lents et vacillants";
  if (ratio <= 0.6) return "blesse, la garde commence a se briser";
  if (ratio <= 0.8) return "entaille et choque, mais encore present";
  return "quasi intact, presence encore stable";
}

function describeStaminaState(stamina, maxStamina){
  const max = Math.max(1, Number(maxStamina) || 1);
  const current = Math.max(0, Number(stamina) || 0);
  const ratio = current / max;
  if (ratio <= 0.2) return "epuise, souffle court";
  if (ratio <= 0.45) return "essouffle";
  if (ratio <= 0.7) return "cadence irreguliere";
  return "souffle stable";
}

function describeReadinessState(life, maxLife, stamina, maxStamina){
  const lifeMax = Math.max(1, Number(maxLife) || 1);
  const lifeCurrent = Math.max(0, Number(life) || 0);
  const lifeRatio = lifeCurrent / lifeMax;
  const staminaMax = Math.max(1, Number(maxStamina) || 1);
  const staminaCurrent = Math.max(0, Number(stamina) || 0);
  const staminaRatio = staminaCurrent / staminaMax;

  if (lifeRatio <= 0.12 || (lifeRatio <= 0.2 && staminaRatio <= 0.35)) {
    return "critique: un coup de plus peut l'abattre, repli urgent conseille";
  }
  if (lifeRatio <= 0.3 || staminaRatio <= 0.2) {
    return "fragilise: peut encore agir, mais la moindre erreur sera fatale";
  }
  if (lifeRatio <= 0.6 || staminaRatio <= 0.45) {
    return "tenable: peut poursuivre le combat avec prudence";
  }
  return "favorable: peut continuer l'affrontement sans signe immediate d'effondrement";
}

async function getFightContext(fight){
  const allies = fight.allies;
  const ennemies = fight.ennemies;
  const floorNumber = fight.floorNumber;
  const floorBackground = await getFloorBackground(floorNumber)
  const groupOneDescription = await getPlayerGroupDescription(allies, 1);
  const groupTwoDescription = (ennemies[0].fighterType == "Player") ? await getPlayerGroupDescription(ennemies, 2) : await getMonsterGroupDescription(ennemies);
  return `Il s'agit d'un combat dans l'univers de Danmachi entre deux groupes : \n ${groupOneDescription} \n ${groupTwoDescription}
  \nLe combat se situe dans ${(floorBackground) ? `dans le donjon d'Orario, ${floorBackground}` : "Dans la ville d'Orario"}`
}

async function getPlayerGroupDescription(group, groupNumber){
  const groupDescription = `- Groupe ${groupNumber} : ${await group.reduce(async (total, fighter) => {
    const fighterModel = fighter.fighterModel;
    const weapon = await equipmentService.getEquippedWeapon(fighterModel.characterId);
    const armor = await equipmentService.getEquippedArmor(fighterModel.characterId);
    const vitals = describeVitalState(fighter.life, fighter.maxLife);
    const staminaState = describeStaminaState(fighterModel.stamina, fighterModel.maxStamina);
    const readinessState = describeReadinessState(fighter.life, fighter.maxLife, fighterModel.stamina, fighterModel.maxStamina);
    return `${await total}\n 
    - ${fighter.name} - Race : ${fighterModel.race} - Etat : ${vitals} - Souffle : ${staminaState} - Lecture tactique : ${readinessState} -
    Arme : ${(weapon) ? weapon.name : "Aucune"} : ${(weapon) ? weapon.description : "Aucune Description"} - Armure : ${(armor) ? armor.name : "Aucune"}`}, Promise.resolve(""))}.`;
  return groupDescription;
}

async function getMonsterGroupDescription(group){
  const groupDescription = `- Groupe 2 : ${await group.reduce((total, fighter) => {
    const monster = fighter.fighterModel;
    return `${total}\n -${fighter.name} : ${monster.description}`
  }, "")}`
  return groupDescription
}

export async  function initFight(floorNumber, group){
  // Create a fight 
  const fight = await FightRoute.newFight(floorNumber);
// Generate Ennemies List and push it in ennemies
  const ennemies = await generateMonsterInFloor(fight);
// Get Allies List 
  const allies = [...group];
  // Convert all fighter in Fighter Object
  const fightersAllies = await Promise.all(allies.map((ally) => { return Fighter.create(ally, FighterType.PLAYER)}));
// Add allies and ennemies in fight
  await fight.allies.push(...fightersAllies);
// Init Turn Table
  const turnTable = fight.turnTable;
  await turnTable.init(fightersAllies, ennemies);
  const initFightContext = await getInitContext(
    fight,
    narrationStyles.CINEMA,
    narrationLength.SHORT
  )
  fight.resume = await AIHandler.generateText(initFightContext);
  return fight;
}

export async function fighterAttackTheTarget(fighter, target, description){
  const fighterRoll = await fighter.ratioDamageAttack(target);
  const targetRoll = await target.ratioDamageDefense(fighter);
  const damage = (fighterRoll - targetRoll > 0) ? await fighter.getDamageOnTarget(target) : 0;
  await target.takeDamage(damage);
  const action = getAction(fighter, target, damage, description);
  return action
}

export function getAction(fighter, target, damage, description){
  if(damage > 0){
    const targetIsDead = target.isDead;
    const resume = (targetIsDead) ? `${fighter.name} kill ${target.name}` : `${target.name} took ${damage} damage from ${fighter.name}`;
    return new ActionModel(
      resume,
      fighter,
      target, 
      actionTypes.PHYSIC_DAMAGE,
      damage,
      fighter.getTotalStrength(),
      description
    )
  } else {
    const dodgeOrBlock = target.dodgeOrBlock()
    const resume = `${target.name} has ${dodgeOrBlock} the attack from ${fighter.name}`
    return new ActionModel(
      resume,
      target,
      fighter, 
      (dodgeOrBlock === "Block") ? actionTypes.PARADE : actionTypes.DODGE,
      damage,
      fighter.getTotalStrength(),
      description
    )
  }
}

export function addActionInQueue(fight, action){
  const actionQueue = fight.actionQueue;
  return actionQueue.push(action)
}

export async function updateResume(fight){
  const actionQueue = fight.actionQueue;
  const turnTable = fight.turnTable;
  const context = await getFightContext(fight);
  const prompt = `
  Rédige une phrase courte et naratif pour les actions effectuer par ${turnTable.currentFighter} dans le combat dans un ton épic.
  Contexte : ${context}\n
  Actions : ${actionQueue.reduce((total, action) => { return `${total}\n\n Action du Joueur : ${action.description}\n\nRésultats : ${action.resume}\n\n`}, "")}.
  La phrase doit : 
  - Prendre en compte la description du joueur si cela est pertinent.
  - Faire le lien entre l'action du joueur et le résultat qui en découle.
  - Donner des indices clairs sur l'etat des combattants via des signes visibles (mordu, griffe, saigne, vacille, souffle brise), sans chiffres.
  - Si un aventurier est en etat critique, indiquer explicitement qu'un seul impact de plus peut le faire tomber.
  - Si un aventurier peut encore tenir, le formuler clairement (tenir, vaciller, ou repli urgent) sans chiffre ni pourcentage.
  - Inventé une action si le joueur n'en a pas fourni. 
  - Etre succinct, pas plus de 180 tokens. 
  - Avoir un vocabulaire commun voir même simpliste.
  
  La phrase ne doit pas : 
  - Prendre en compte la description si celle n'est pas cohérente avec le contexte.
  - Contenir de vulgarité.
  - Briser l'immersion en parlant de tour ou de point de vie, mana, énergie, ect.
  - Parler de magie si aucun contexte pertinent n'est donné. 
  - Se couper sans avoir la fin de la phrase.
  
  Format : Une phrase courte.`;
  console.log(`Update resume prmpt : ${prompt}`);
  fight.actionQueue = [];
  const resume = await AIHandler.generateText(prompt);
  fight.resume =  resume;
  return resume
}

export async function generateMonsterInFloor(fight){
  const floorNumber = fight.floorNumber
  const possibleMonster = await getMonsterInFloor(floorNumber);
  const spawnRatio = Math.floor((floorNumber * 8)/10); 
  const monsterNumber = Math.floor(Math.random() * spawnRatio) + 1;
  const selectedMonsterIndex = Math.floor(Math.random() * possibleMonster.length);
  const selectedMonster = possibleMonster[selectedMonsterIndex];

  // Boucle for pour généré une liste de fighter associé au monstre en fonction de la taille du groupe
  for(let i=0; i <= monsterNumber; i++ ){
    console.log(`Monster name before update ${selectedMonster.name}`)
    selectedMonster.name = `${selectedMonster.name} ${i+1}`
    console.log(`Monster ID after update ${selectedMonster.name}`)
    await fight.ennemies.push(await Fighter.create(selectedMonster, FighterType.MONSTER))
    await selectedMonster.reload();
  }
  return fight.ennemies;
}

export async function getMonsterInFloor(floorNumber){
  return await MonsterService.getMonsterInFloor(floorNumber)
}

export function getFightById(fightId){
  return FightRoute.getFightById(fightId);
}

export function getFightByGroupId(groupId){
  return FightRoute.getFightByGroupId(groupId);
}

export function endFight(fightId){
  return FightRoute.deleteFightById(fightId);
}

export function nextTurn(fight){
  const turnTable = fight.turnTable;
  return turnTable.nextTurn();
}

export function tryFlee(fight){
  const turnTable = fight?.turnTable;
  const runner = turnTable?.currentFighter;
  if (!runner) {
    return { success: false, chance: 0, roll: 1, monsterName: "Monstres" };
  }

  const enemies = (runner.fighterType === FighterType.PLAYER) ? (fight.ennemies ?? []) : (fight.allies ?? []);
  const aliveEnemies = enemies.filter(e => !e.isDead);
  const referenceEnemy = aliveEnemies[0] ?? enemies[0];

  const runnerSpeed = Number(runner.getTotalAgility?.() ?? 0) || 0;
  const enemySpeed = Number(referenceEnemy?.getTotalAgility?.() ?? 0) || 0;

  // Base 50%, with small bonus/malus based on agility difference.
  const diff = runnerSpeed - enemySpeed;
  const bonus = Math.max(-0.2, Math.min(0.2, diff / 200));
  const chance = Math.max(0.15, Math.min(0.85, 0.5 + bonus));
  const roll = Math.random();
  const success = roll < chance;

  const monsterName = aliveEnemies.length === 1
    ? aliveEnemies[0].name
    : (aliveEnemies.length > 1 ? "Monstres" : "Monstres");

  return { success, chance, roll, monsterName };
}

export function monsterTurn(fight){
  const turnTable = fight.turnTable;
  const currentFighter = turnTable.currentFighter;
  const target = monsterSelectTarget(fight);
  return fighterAttackTheTarget(currentFighter, target, "")
}

function monsterSelectTarget(fight){
  const allies = fight.allies;
  const alliesAlive = allies.filter(ally => {
    return !ally._isDead();
  })
  const standardTargetsAgroMap = standarizationTargetsAgro(alliesAlive);
  const target = selectRandomTarget(standardTargetsAgroMap);
  return target
}

function standarizationTargetsAgro(targets){
  const targetsAgroMap = new Map();
  const agroMax = targets.reduce((total, target) => {return total + target.agro}, 0);
  const targetsLength = targets.length;
  if(targetsLength == 1){
    targetsAgroMap.set(targets[0], 1);
  } else {
    let currentAgro = 0
    targets.forEach(target => {
    const standardAgro = (agroMax > 0) ? target.agro / agroMax : 1/targetsLength;
    currentAgro += standardAgro
    targetsAgroMap.set(target, currentAgro);
  })
  }
  return targetsAgroMap 
}

function selectRandomTarget(targetsMap){
  const randomNumber = Math.random();
  const targets = [...targetsMap.keys()];
  const target = targets.find((target) => {return targetsMap.get(target) >= randomNumber});
  return target
}

export function getLastAction(fight){
  const queue = fight.actionQueue;
  const lastAction = queue[queue.length - 1];
  return lastAction
}

async function applyOnHitEffects(fighter, allies, targets){
  if(this.onHitEffects.size){
      this.onHitEffects.forEach(async (skill, effect) => {
        const powerEffect = await CapacityEffectService.getPowerCapacityEffect(effect, fighter, target);
        const effectModel = await CapacityEffectService.getCapacityEffect(effect);
          if(effectModel.type == "Negatif" ){ 
            await effectModel.useEffect(targets, powerEffect)
          } else {
            await effectModel.useEffect([fighter], powerEffect)
          }
      })
  }
}
/* 
export async function calculXp(action, player, monster, totals) {
  const config = xpStats[action.damageType];
  if (!config) return 0;

  const total = totals?.[config.totalKey] ?? 0;
  const playerStat = player?.[config.playerStat] ?? 0;
  const monsterStat = monster?.[config.monsterStat] ?? 0;

  if (total <= 0 || pStat <= 0 || mStat <= 0) return 0;

  const ratio = playerStat / monsterStat;
  const part  = action.value / total;
  const raw   = (ratio * part * monster.level) - player.level - 1;

  return raw > 0 ? raw : 0;
}


export async function startCombat(interaction) {
  if (Math.random() < 0.45) {
    const floor = character.floor;
    const possibleMonsters = monsters.filter();
    if (possibleMonsters.length > 0) {
      const monster = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
      const combatEmbed = new EmbedBuilder()
        .setTitle(`⚔ Combat contre ${monster.name} - Étage ${floor}`)
        .setDescription(`${trimToSentence(await generateGodResponse(userId, godKey, `Un ${monster.name} surgit à l'étage ${floor}. Exprime-toi en deux phrases max.`, 80),200)}\n${trimToSentence(await generateGodResponse(userId, godKey, `Que dis-tu pour affronter ce ${monster.name} ? Trois phrases max.`, 80),200)}`)
        .setColor("DarkRed")
        .setImage(monster.image || "https://example.com/monster_encounter.png");
      const rowCombat = await getCombatButtons(stateKey);
      const combatMessage = await interaction.editReply({ embeds: [combatEmbed], components: [rowCombat] });
      newCombatState = {
        actionLog: []
      };
      return;
    }
  }
}

/** 
 * Fuite : compare l’agilité du joueur et la vitesse du monstre (avec bonus aléatoires)
 */
export async function processFlee(
  statsRecord,
  chosenStats,
  monster,
  userActionText,
  godKey,
  interaction,
  originalMessage,
  gods
) {
  const playerSpeed = Number(statsRecord.agility) || 10;
  const monsterSpeed = Number(monster.speed) || 10;
  const playerRand = Math.floor(Math.random() * 10);
  const monsterRand = Math.floor(Math.random() * 10);
  const playerFleeScore = playerSpeed + playerRand;
  const monsterFleeScore = monsterSpeed + monsterRand;
  
  let outcomeText =
    `Tentative de fuite :\n` +
    `Ton score: Agilité (${playerSpeed}) + ${playerRand} = ${playerFleeScore}\n` +
    `Monstre: Vitesse (${monsterSpeed}) + ${monsterRand} = ${monsterFleeScore}\n`;
  
  if (playerFleeScore >= monsterFleeScore) {
    outcomeText += `Fuite réussie !`;
    return { outcomeText, fleeSuccess: true };
  } else {
    outcomeText += `Fuite échouée !`;
    return { outcomeText, fleeSuccess: false };
  }
}

export function hasAlliesWon(fight){
  const ennemies = fight?.ennemies ?? [];
  if(ennemies.length === 0) return true;

  for (const ennemy of ennemies){
    if (!ennemy.isDead) return false;
  }
  return true
}

export function haveAlliesDead(fight){
  const allies = fight.allies ?? [];
  if (allies.length === 0) return true;
  return allies.every((ally) => ally?.isDead);
}

export async function handleEnnemiesWin(fight, { client, guildId } = {}) {
  for (const ally of (fight.allies ?? [])) {
    await CharacterService.syncFighterHealth(ally, { client, guildId });
  }

  return {
    type: "allies_lose",
    ennemiesNames: (fight.ennemies ?? []).map(e => e.name),
    deadAllies: (fight.allies ?? []).filter(a => a._isDead()).map(a => ({ name: a.name })),
  };
}

export async function handleAlliesWin(fight, { client, guildId } = {}) {
  const participantIds = (fight.allies ?? []).map(a => a.id);
  const lootList = Array.isArray(fight.loot) ? fight.loot : [];
  let finalNarration = "";

  try {
    if (Array.isArray(fight.actionQueue) && fight.actionQueue.length > 0) {
      finalNarration = await updateResume(fight);
    } else {
      finalNarration = (fight.resume || "").toString().trim();
    }
  } catch {
    finalNarration = (fight.resume || "").toString().trim();
  }

  const monsterNames = [...new Set((fight.ennemies ?? [])
    .map((e) => (e?.fighterModel?.name || e?.name || "").toString().replace(/\s+\d+$/, "").trim())
    .filter(Boolean))];
  const resolvedMonsterName = monsterNames.length ? monsterNames.join(", ") : (fight.monsterName ?? "Monstres");

  if (lootList.length === 0) {
    for (const ennemy of (fight.ennemies ?? [])) {
      const monster = ennemy.fighterModel ?? ennemy;

      const drops = await LootService.generateMonsterLootList(monster);

      if (Array.isArray(drops) && drops.length) {
        lootList.push(...drops);
      }
    }

    fight.loot = lootList;
  }

  const distribution = await LootService.distributeCombatLoot(participantIds, lootList, {
    monsterId: fight.monsterId ?? null,
    monsterName: resolvedMonsterName,
    sessionId: fight.sessionId ?? null,
    floor: fight.floorNumber ?? 0,
  });

  const missionCompletions = await GuildMissionService
    .autoTrackKillMissions(resolvedMonsterName, participantIds)
    .catch(() => []);

  // Persist remaining HP after combat (no full heal on win).
  for (const ally of (fight.allies ?? [])) {
    await CharacterService.syncFighterHealth(ally, { client, guildId });
  }

  await winExperience([...fight.allies].map(ally => {return ally.fighterModel}));

  return {
    type: "allies_win",
    monsterName: resolvedMonsterName,
    finalNarration,
    lootSummary: {
      ...LootService.summarizeLootList(lootList),
      perPlayer: true,
      participantsCount: participantIds.length,
    },
    lootByPlayer: distribution?.perPlayer ?? [],
    missionCompletions,
  };
}

async function winExperience(fighters){
  return await Promise.all(fighters.map(async (fighter) => {
    const experience = {
      strength : Math.floor(Math.random() * 5),
      dexterity : Math.floor(Math.random() * 5),
      agility : Math.floor(Math.random() * 5),
      intelligence : Math.floor(Math.random() * 5),
      endurance : Math.floor(Math.random() * 5),
    };
    const pendingStats = await fighter.getPendingStat();
    await PendingStatsService.addExperienceInPendingStats(pendingStats, experience)
  }))
}
