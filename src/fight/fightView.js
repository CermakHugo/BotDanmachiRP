import { ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, LabelBuilder, MessageFlags, TextInputStyle } from "discord.js";

export async function printEphemeralMessage(interaction, messageContent){
    return await interaction.reply({content: messageContent, flags: MessageFlags.Ephemeral});
}

export async function showMessage(interaction, message){
    return await interaction.reply(message);
}

export async function showModal(interaction, modal){
  return await interaction.showModal(modal);
}

export async function editMessage(interaction, message){
    return await interaction.editReply(message);
}

export async function waitInteraction(interaction){
  return await interaction.deferReply()
}

export async function waitComponentInteraction(interaction){
  return await interaction.deferUpdate();
}

function isHttpUrl(value){
  if(!value) return false;
  return /^https?:\/\/\S+$/i.test(value.toString().trim());
}

function getCurrentFighterImage(currentFighter){
  if(!currentFighter) return null;
  if(currentFighter.fighterType === "Monster"){
    const monsterImage = currentFighter?.fighterModel?.appearance || currentFighter?.fighterModel?.image;
    return isHttpUrl(monsterImage) ? monsterImage : null;
  }
  const characterImage = currentFighter?.fighterModel?.appearance;
  return isHttpUrl(characterImage) ? characterImage : null;
}

function getAliveFightersNames(fighters){
  const list = (fighters || []).filter((f) => !f?.isDead).map((f) => `**${f.name}**`);
  return list.length ? list.join(", ") : "aucun";
}

function getDeadFightersNames(fighters){
  const list = (fighters || []).filter((f) => f?.isDead).map((f) => `**${f.name}**`);
  return list.length ? list.join(", ") : null;
}

function getCriticalEvents(fight){
  const events = [];
  const actions = Array.isArray(fight?.actionQueue) ? fight.actionQueue : [];

  for (const action of actions) {
    const authorName = action?.author?.name || "Quelqu'un";
    const targetName = action?.target?.name || "une cible";
    const targetIsDead = Boolean(action?.target?.isDead);
    const targetIsPlayer = action?.target?.fighterType === "Player";
    if (targetIsDead && targetIsPlayer) {
      events.push(`**${authorName}** porte un coup fatal a **${targetName}**.`);
    }
  }

  return events.length ? events : null;
}

function getFightTurnEmbed(fight){
  const turnTable = fight.turnTable;
  const currentFighter = turnTable.currentFighter;
  const nextFighter = turnTable.nextFighterTurn;
  const turnNumber = turnTable.turnNumber;
  const context = (fight.resume || "Le combat se poursuit dans le chaos du donjon.").toString().trim();
  const embed = new EmbedBuilder()
  .setTitle(`⚔ Tour ${turnNumber} — ${currentFighter.name}`)
  .setDescription(
    `**Narration**\n${context}\n\n` +
    `**Initiative**\n${currentFighter.name} agit maintenant. ${nextFighter.name} se prepare.`
  )
  .addFields(
      { name: "Allies en ligne", value: getAliveFightersNames(fight.allies), inline: false },
      { name: "Ennemis en vue", value: getAliveFightersNames(fight.ennemies), inline: false },
  )
  .setColor(currentFighter.fighterType === "Monster" ? "#c0392b" : "#0e7490")
  .setFooter({text : `Prochain tour: ${nextFighter.name}`})
  .setTimestamp();

  const deadAllies = getDeadFightersNames(fight.allies);
  if (deadAllies) {
    embed.addFields({ name: "Allies tombes", value: deadAllies, inline: false });
  }
  const criticalEvents = getCriticalEvents(fight);
  if (criticalEvents) {
    embed.addFields({ name: "Evenements critiques", value: criticalEvents.join("\n"), inline: false });
  }

  const currentImage = getCurrentFighterImage(currentFighter);
  if(currentImage){
    embed.setThumbnail(currentImage);
  }
  return embed;
}

function getPlayerActionButtons(fight){
  const turnTable = fight.turnTable;
  const currentFighter = turnTable.currentFighter;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`attack:fighter=${currentFighter.id}:fightId=${fight.id}`)
      .setLabel("Attaque")
      .setStyle("Primary"),
    new ButtonBuilder()
      .setCustomId(`magie:fighter=${currentFighter.id}:fightId=${fight.id}`)
      .setLabel("Magie")
      .setStyle("Secondary")
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`item:fighter=${currentFighter.id}:fightId=${fight.id}`)
      .setLabel("Item")
      .setStyle("Success")
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`fuite:fighter=${currentFighter.id}:fightId=${fight.id}`)
      .setLabel("Fuite")
      .setStyle("Success"),
  );
}

export function createPlayerFightTurnMessage(fight){
  const embed = getFightTurnEmbed(fight);
  const playerActionButtons = getPlayerActionButtons(fight);
  return { embeds: [embed], components : [playerActionButtons]};
}

export function createMonsterFightTurnMessage(fight){
  const embed = getFightTurnEmbed(fight);
  const turnNumber = Number(fight?.turnTable?.turnNumber || 0);
  const monsterButton = new ActionRowBuilder().addComponents(new ButtonBuilder()
  .setCustomId(`next:fightId=${fight.id}:turn=${turnNumber}`)
  .setLabel("Suivant")
  .setStyle("Success"));
  return { embeds: [embed], components : [monsterButton] };
}

function createEnnemySelector(ennemies){
  const ennemySelector = new StringSelectMenuBuilder()
    .setCustomId(`target`)
    .setPlaceholder("Selectionner un ennemi");
  ennemies.forEach((ennemy) => {
    if(!ennemy.isDead){
      ennemySelector.addOptions(
      new StringSelectMenuOptionBuilder()
      .setLabel(`${ennemy.name}`)
      .setDescription(`${ennemy.life}`)
      .setValue(ennemy.id)
    )}
  });
  const ennemySelectorLabel = new LabelBuilder()
  .setLabel("Cible Principale :")
  .setStringSelectMenuComponent(ennemySelector);
  return ennemySelectorLabel
}

function createActionInput(){
  const actionTextInput = new TextInputBuilder()
  .setCustomId("actionInput")
  .setPlaceholder("Entrer votre action...")
  .setMaxLength(1024)
  .setRequired(false)
  .setStyle(TextInputStyle.Paragraph);
  const actionInputLabel = new LabelBuilder()
  .setLabel("Action :")
  .setTextInputComponent(actionTextInput);
  return actionInputLabel
}

export function createAttackPlayerModal(fight){
  if (!fight || !fight.turnTable) return null;
  const actionInput = createActionInput();
  const currentFighter = fight.turnTable.currentFighter;
  let ennemies
  if(fight.allies.includes(currentFighter)){
    ennemies = fight.ennemies;
  } else {
    ennemies = fight.allies;
  }
  const targetSelector = createEnnemySelector(ennemies);
  const modal = new ModalBuilder()
  .setCustomId(`playerAttackModal:fightId=${fight.id}`)
  .setTitle("Attaque — Choisir une action")
  .addLabelComponents([actionInput, targetSelector]);
  return modal 
}

function getVictoryLootEmbed(result) {
  const loot = result?.lootSummary;
  const lootByPlayer = Array.isArray(result?.lootByPlayer) ? result.lootByPlayer : [];
  const finalNarration = (result?.finalNarration || "").toString().trim();

  const lines = [];
  if ((loot?.money ?? 0) > 0) lines.push(`+${loot.money} valis`);

  for (const it of (loot?.items ?? [])) {
    lines.push(`${it.name} x${it.quantity}`);
  }

  if (!lines.length) lines.push("Aucun butin.");

  const monsterName = result?.monsterName ?? result?.monster?.name ?? "Monstre";
  const count = loot?.participantsCount ?? 0;
  const playerLines = lootByPlayer.length
    ? lootByPlayer.map((entry) => {
      const money = Number(entry?.lootSummary?.money || 0);
      const items = Array.isArray(entry?.lootSummary?.items) ? entry.lootSummary.items : [];
      const itemText = items.length
        ? items.map((it) => `${it.name} x${it.quantity}`).join(", ")
        : "aucun objet";
      return `- <@${entry.characterId}> : ${money} valis${items.length ? `, ${itemText}` : ""}`;
    }).join("\n")
    : "Aucun detail de distribution.";

  return new EmbedBuilder()
    .setTitle(`Victoire !`)
    .setDescription(`Vous avez vaincu **${monsterName}**.`)
    .addFields(
      {
        name: "Dernier echange",
        value: finalNarration || "Le coup final a tranche le silence du donjon.",
        inline: false
      },
      {
        name: "Butin total",
        value: lines.join("\n"),
        inline: false
      },
      {
        name: "Repartition",
        value: playerLines,
        inline: false
      }
    )
    .setColor("#f1c40f")
    .setFooter({ text: `Distribue a ${count} aventurier(s).` })
    .setTimestamp();
}

export function createFightVictoryMessage(result) {
  const embed = getVictoryLootEmbed(result);
  return { embeds: [embed], components: [] };
}


function getFightLoseEmbed(result) {
  const ennemiesText = (result?.ennemiesNames?.length)
    ? result.ennemiesNames.map(n => `• **${n}**`).join("\n")
    : "—";

  const deadAlliesText = (result?.deadAllies?.length)
    ? result.deadAllies.map(a => `• ${a.name}`).join("\n")
    : "—";

  return new EmbedBuilder()
    .setTitle("💀 Défaite…")
    .setDescription("Les alliés ont été vaincus.")
    .addFields(
      { name: "Ennemis", value: ennemiesText, inline: false },
      { name: "Alliés tombés", value: deadAlliesText, inline: false }
    )
    .setColor("#c0392b")
    .setTimestamp();
}

export function createFightDefeatMessage(result) {
  return { embeds: [getFightLoseEmbed(result)], components: [] };
}

function getFightFleeEmbed(result) {
  const monsterName = result?.monsterName ?? "Monstres";
  const title = result?.success ? "🏃 Fuite reussie !" : "🏃 Fuite echouee...";
  const description = result?.success
    ? `Vous fuyez et echappez a **${monsterName}**.`
    : `Vous tentez de fuir, mais **${monsterName}** vous rattrape !`;

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(result?.success ? "#2ecc71" : "#e67e22")
    .setTimestamp();
}

export function createFightFleeMessage(result) {
  return { embeds: [getFightFleeEmbed(result)], components: [] };
}

export async function createStartFightButton(message, group, floor){
  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
  .setCustomId(`startFight:groupId=${group.dbGroupId}:floor=${floor}`)
  .setLabel("Fight !")
  .setStyle("Success")
  );
  const messagePayload = {content : "Préparer vous à combatre", components: [button]};
  return await message.reply(messagePayload)
}

