import * as FightService from "./fightService.js"
import * as FightView from "./fightView.js"
import * as GroupService from "../group/groupService.js"
import * as LootService from "../loot/lootService.js";
import * as CharacterService from "../character/CharacterService.js";
import * as GuildMissionController from "../guildMission/guildMissionController.js";

const fightInteractionLocks = new Set();
const fightStartLocks = new Set();

function isFightInteractionLocked(fightId){
  return fightInteractionLocks.has(String(fightId));
}

function lockFightInteraction(fightId){
  fightInteractionLocks.add(String(fightId));
}

function unlockFightInteraction(fightId){
  fightInteractionLocks.delete(String(fightId));
}

function isFightStartLocked(groupId){
  return fightStartLocks.has(String(groupId));
}

function lockFightStart(groupId){
  fightStartLocks.add(String(groupId));
}

function unlockFightStart(groupId){
  fightStartLocks.delete(String(groupId));
}

async function replyFightBusy(interaction){
  const payload = { content: "Action deja en cours sur ce combat, attends une seconde.", ephemeral: true };
  if (interaction.deferred || interaction.replied) {
    return await interaction.followUp(payload).catch(() => {});
  }
  return await interaction.reply(payload).catch(() => {});
}

async function replyFightEnded(interaction){
  const payload = { content: "Ce combat est deja termine.", ephemeral: true };
  if (interaction.deferred || interaction.replied) {
    return await interaction.followUp(payload).catch(() => {});
  }
  return await interaction.reply(payload).catch(() => {});
}

async function clearFightStartButtonMessage(interaction, fight){
  const channelId = fight?.startChannelId;
  const messageId = fight?.startMessageId;
  if (!channelId || !messageId) return;

  try {
    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased?.()) return;
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return;
    await message.edit({ components: [] }).catch(() => {});
  } catch {}
}

export async  function startFight(interaction){
    await FightView.waitInteraction(interaction);
    const characterId = interaction.user.id;
    const group = await GroupService.getGroupByLeaderId(characterId);
    const members = await GroupService.getMembers(group);
    const floorNumber = 2;
    const newFight = await FightService.initFight(floorNumber, [...members]);
    newFight.groupId = group?.groupId ?? null;
    return await nextTurn(interaction, newFight.id)
}

export async function encouterEnnemies(message, group, floor){
  return await FightView.createStartFightButton(message, group, floor)
}

export async function startFightInExpedition(interaction, groupId, floor){
    if (isFightStartLocked(groupId)) {
      if (!interaction.deferred && !interaction.replied) {
        return await interaction.reply({ content: "Demarrage du combat deja en cours...", ephemeral: true });
      }
      return;
    }

    lockFightStart(groupId);
    try {
      const existingFight = FightService.getFightByGroupId(groupId);
      if (existingFight) {
        const session = GroupService.findSessionByGroupId(groupId);
        const stillLocked = Boolean(session?.expeditionFightLocked);

        if (!stillLocked) {
          FightService.endFight(existingFight.id);
        } else {
          if (!interaction.deferred && !interaction.replied) {
            return await interaction.reply({ content: "Un combat est deja en cours pour ce groupe.", ephemeral: true });
          }
          return;
        }
      }

      await FightView.waitComponentInteraction(interaction);
      await FightView.editMessage(interaction, {
        content: "Le bot reflechit... preparation du combat en cours.",
        components: [],
      }).catch(() => {});
      const group = await GroupService.getGroupById(groupId);
      const members = await GroupService.getMembers(group);
      const floorNumber = floor;
      const newFight = await FightService.initFight(floorNumber, [...members]);
      newFight.groupId = groupId;
      newFight.startMessageId = interaction.message?.id ?? null;
      newFight.startChannelId = interaction.channelId ?? null;
      return await nextTurn(interaction, newFight.id)
    } finally {
      unlockFightStart(groupId);
    }
}

async function endExpeditionAfterWipe(interaction, fight){
  const groupId = fight?.groupId;
  if(!groupId) return;

  const session = GroupService.findSessionByGroupId(groupId);
  if(!session?.isFinalized) return;
  if(!interaction.guild) return;

  const deleteChannelSafe = async (channelId) => {
    if(!channelId) return;
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if(!channel) return;
    await channel.delete("Expedition terminee (groupe KO)").catch(() => {});
  };

  await deleteChannelSafe(session.expeditionTextChannelId);
  await deleteChannelSafe(session.expeditionVoiceChannelId);
  await GroupService.dissolveSession(session.id).catch(() => {});
}

export async function nextTurn(interaction, fightId) {
  if (!interaction.deferred) {
    await FightView.waitInteraction(interaction);
  }

  const fight = await FightService.getFightById(fightId);
  if (!fight) {
    return await FightView.editMessage(interaction, { content: "❌ Combat introuvable." });
  }

  const currentFighter = await FightService.nextTurn(fight);

  const somebodyWin = await somebodyWinFight(interaction, fight);
  if (somebodyWin) return;

  return (currentFighter.fighterType == "Player")
    ? await playerTurnHandler(interaction, fight)
    : await monsterTurnHandler(interaction, fight);
}

export async function nextTurnFromButton(interaction, fightId, expectedTurn = null){
  if (isFightInteractionLocked(fightId)) {
    return await replyFightBusy(interaction);
  }

  lockFightInteraction(fightId);
  try {
    const fight = await FightService.getFightById(fightId);
    if (!fight) {
      return await FightView.editMessage(interaction, { content: "❌ Combat introuvable." });
    }

    const currentTurn = Number(fight?.turnTable?.turnNumber || 0);
    if (expectedTurn !== null && Number(expectedTurn) !== currentTurn) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: "Ce bouton n'est plus valide pour le tour actuel.",
          ephemeral: true,
        }).catch(() => {});
      }
      return;
    }

    return await nextTurn(interaction, fightId);
  } finally {
    unlockFightInteraction(fightId);
  }
}

export async function playerTryToFlee(interaction, fightId) {
  if (isFightInteractionLocked(fightId)) {
    return await replyFightBusy(interaction);
  }
  lockFightInteraction(fightId);
  try {
  if (!interaction.deferred) {
    await FightView.waitInteraction(interaction);
  }

  const fight = await FightService.getFightById(fightId);
  if (!fight) {
    return await FightView.editMessage(interaction, { content: "❌ Combat introuvable." });
  }

  const currentFighter = fight.turnTable?.currentFighter;
  if (!currentFighter || interaction.user.id !== String(currentFighter.id)) {
    return await forbidenInteraction(interaction, fightId);
  }

  const result = FightService.tryFlee(fight);
  if (result.success) {
    for (const ally of (fight.allies ?? [])) {
      await CharacterService.syncFighterHealth(ally, { client: interaction.client, guildId: interaction.guildId });
    }
    await clearFightStartButtonMessage(interaction, fight);
    await GroupService.setExpeditionFightLockedByGroupId(fight?.groupId, false).catch(() => {});
    FightService.endFight(fightId);
    return await FightView.editMessage(interaction, FightView.createFightFleeMessage(result));
  }

  fight.resume = `${currentFighter.name} tente de fuir, mais echoue.`;
  return await nextTurn(interaction, fightId);
  } finally {
    unlockFightInteraction(fightId);
  }
}
export function playerChooseATarget(interaction, fightId){
    const fight = FightService.getFightById(fightId);
    if (!fight || !fight.turnTable) {
      return replyFightEnded(interaction);
    }

    const currentFighter = fight.turnTable.currentFighter;
    if (!currentFighter || interaction.user.id !== String(currentFighter.id)) {
      return forbidenInteraction(interaction, fightId);
    }

    const ennemySelectorModal = FightView.createAttackPlayerModal(fight);
    if (!ennemySelectorModal) {
      return replyFightEnded(interaction);
    }
    return FightView.showModal(interaction, ennemySelectorModal);
}

export async function playerAttackTheTarget(interaction, fightId){
    if (isFightInteractionLocked(fightId)) {
        return await replyFightBusy(interaction);
    }
    lockFightInteraction(fightId);
    try {
        await FightView.waitInteraction(interaction);
        const fight = await FightService.getFightById(fightId);
        if (!fight || !fight.turnTable) {
          return await FightView.editMessage(interaction, { content: "Ce combat est deja termine.", components: [] });
        }
        const turnTable = fight.turnTable;
        const currentFighter = turnTable.currentFighter;
        const nextFighter = turnTable.nextFighterTurn;
        const targetId = await interaction.fields.getStringSelectValues("target")[0];
        const target = await turnTable.getFighterById(targetId);
        const description = await interaction.fields.getTextInputValue("actionInput");
        const action = await FightService.fighterAttackTheTarget(currentFighter, target, description);
        await FightService.addActionInQueue(fight, action);
        if (nextFighter === currentFighter){
            await playerPlayAgain(interaction, fight)
        } else {
          await FightService.updateResume(fight);
          await nextTurn(interaction, fightId)
        }
    } catch(error){
        console.error(`Une erreur est survenu lors de l'attaque du joueur : \n${error}`)
    } finally {
        unlockFightInteraction(fightId);
    }
}

async function somebodyWinFight(interaction, fight){
  const fightId = fight.id;
  if (FightService.haveAlliesDead(fight)) {
    await clearFightStartButtonMessage(interaction, fight);
    await FightService.handleEnnemiesWin(fight, { client: interaction.client, guildId: interaction.guildId });
    await GroupService.setExpeditionFightLockedByGroupId(fight?.groupId, false).catch(() => {});
    await endExpeditionAfterWipe(interaction, fight).catch(() => {});
    FightService.endFight(fightId);
    await FightView.editMessage(interaction, {
      content: "Le groupe est KO. L'expedition est terminee.",
      embeds: [],
      components: [],
    }).catch(() => {});
    return true;
  }

  if (FightService.hasAlliesWon(fight)) {
    await clearFightStartButtonMessage(interaction, fight);
    const result = await FightService.handleAlliesWin(fight, { client: interaction.client, guildId: interaction.guildId });
    await GroupService.setExpeditionFightLockedByGroupId(fight?.groupId, false).catch(() => {});
    FightService.endFight(fightId);
    await FightView.editMessage(interaction, FightView.createFightVictoryMessage(result));

    if (Array.isArray(result?.missionCompletions) && result.missionCompletions.length) {
      for (const missionSnapshot of result.missionCompletions) {
        await GuildMissionController
          .applyMissionCompletionDisplay(interaction.client, interaction.guildId, missionSnapshot)
          .catch(() => {});
      }
    }

    return true;
  }
  return false;
}

async function playerPlayAgain(interaction, fight){
  const somebodyWin = await somebodyWinFight(interaction, fight);
  if (somebodyWin) return;
  await FightService.nextTurn(fight);
  const action = FightService.getLastAction(fight);
  return await FightView.editMessage(interaction, {content :`${action.resume}, c'est encore votre tour`})
}

export function forbidenInteraction(interaction, fightId){
    const fight = FightService.getFightById(fightId);
    if (!fight || !fight.turnTable) {
      return replyFightEnded(interaction);
    }
    const turnTable = fight.turnTable;
    const currentFighter = turnTable.currentFighter;
    if (!currentFighter) {
      return replyFightEnded(interaction);
    }
    return FightView.printEphemeralMessage(interaction, `Ce n'est pas votre tour, actuellement c'est le tour de ${currentFighter.name}`);
}

async function playerTurnHandler(interaction, fight){
    const message =  await FightView.createPlayerFightTurnMessage(fight);
    return await FightView.editMessage(interaction, message);
}

async function monsterTurnHandler(interaction, fight){
  if(!interaction.deferred){
    await FightView.waitInteraction(interaction);
  }
  const action = await FightService.monsterTurn(fight);
  await FightService.addActionInQueue(fight, action);
  const turnTable = fight.turnTable;
  const currentFighter = turnTable.currentFighter;
  const nextFighter = turnTable.nextFighterTurn;
  if(currentFighter.fighterType != nextFighter.fighterType){
    const message =  await FightView.createMonsterFightTurnMessage(fight);
    await FightView.editMessage(interaction, message);
    await FightService.updateResume(fight);
  } else {
    await nextTurn(interaction, fight.id)
  }
}

export async function fightIsWinForAllies(interaction, fight) {
  const result = await FightService.handleAlliesWin(fight)
  const message = await FightView.createFightVictoryMessage(result);
  return await FightView.editMessage(interaction, message);
}

