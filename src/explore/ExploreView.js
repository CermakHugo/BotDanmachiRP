import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { getCombatButtons } from "./exploreButtons.js";

function formatLootLines(loot = []) {
  if (!loot.length) {
    return "Aucun butin. Pour trouver du butin : fouille / recherche / minage.";
  }
  return loot
    .map((entry) => `<@${entry.memberId}> ${entry.summary}`)
    .join("\n")
    .slice(0, 1024);
}

function buildEndExpeditionRow(sessionId) {
  if (!sessionId) return null;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`group_end:session=${sessionId}`)
      .setLabel("Fin expedition")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildExplorationRow(stateKey, floor = 1) {
  const row = new ActionRowBuilder();
  if (floor > 0) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`explore_action_ascend_${stateKey}`)
        .setLabel("Monter d'un etage")
        .setStyle(ButtonStyle.Primary)
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`explore_action_exit_${stateKey}`)
        .setLabel("Sortir du donjon")
        .setStyle(ButtonStyle.Danger)
    );
  }

  if (Math.random() < 0.4) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`explore_action_descend_${stateKey}`)
        .setLabel("Descendre d'un etage")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`explore_action_continue_${stateKey}`)
      .setLabel("Continuer l'exploration")
      .setStyle(ButtonStyle.Success)
  );

  return row;
}

function applyCommonFields(embed, loot) {
  if (!embed.data.footer) {
    embed.setFooter({ text: "Exploration du donjon" });
  }
  embed.addFields({
    name: "Butin trouve",
    value: formatLootLines(loot),
  });
}

function prepareState(context, encounter) {
  const state = {
    mode: encounter.mode === "story" ? "exploration" : encounter.mode,
    sessionId: context.sessionId,
    stateKey: context.stateKey,
  };
  if (encounter.mode === "combat") {
    state.combat = {
      ...encounter.combatState,
      ownerId: context.userId,
    };
  }
  return state;
}

export async function buildEncounterView(context, encounter) {
  if (encounter.mode === "combat") {
    const embed = new EmbedBuilder()
      .setTitle(`Combat contre ${encounter.monster.name}`)
      .setDescription(
        `${encounter.narration.intro}\n\n${encounter.narration.continuation}`
      )
      .setColor("DarkRed")
      .setFooter({ text: `Etage ${context.character.floor || 1}` });
    if (encounter.monster.image) {
      embed.setImage(encounter.monster.image);
    }
    applyCommonFields(embed, encounter.loot);

    const components = [];
    const combatRow = await getCombatButtons(context.stateKey);
    if (combatRow) components.push(combatRow);
    const endRow = buildEndExpeditionRow(context.sessionId);
    if (endRow) components.push(endRow);

    return {
      payload: { embeds: [embed], components },
      state: prepareState(context, encounter),
    };
  }

  const embed = new EmbedBuilder()
    .setTitle("Exploration paisible")
    .setDescription(encounter.narration)
    .setColor("DarkGreen")
    .setFooter({ text: `Etage ${context.character.floor || 1}` });
  applyCommonFields(embed, encounter.loot);

  const components = [buildExplorationRow(context.stateKey, context.character.floor)];
  const endRow = buildEndExpeditionRow(context.sessionId);
  if (endRow) components.push(endRow);

  return {
    payload: { embeds: [embed], components },
    state: prepareState(context, encounter),
  };
}

export function attachMessageToState(state, message) {
  return { ...state, message };
}

export function buildExpeditionChatEmbed(outcome) {
  const isBossFight = outcome?.type === "fight" && Boolean(outcome?.monster?.isBoss);
  const embed = new EmbedBuilder()
    .setTitle(
      isBossFight
        ? `Chronique du Donjon - BOSS a l'etage ${outcome.floor}`
        : `Chronique du Donjon - etage ${outcome.floor}`
    )
    .setDescription("Les choix des aventuriers s'entrelacent, et les divinites en tirent le fil du destin.")
    .setColor(isBossFight ? "#8e44ad" : outcome.type === "fight" ? "DarkRed" : "DarkGreen");

  if (outcome.type === "cooldown") {
    embed
      .setColor("Grey")
      .setTitle("Le temps suspend son souffle")
      .setDescription(outcome.narration || "Le donjon observe encore. Patiente un instant.");
    return embed;
  }

  if (outcome.type === "error") {
    embed
      .setColor("Red")
      .setTitle("Le fil du destin se brise")
      .setDescription(outcome.narration || "Une force contrarie cette action.");
    return embed;
  }

  if (outcome.type === "exit") {
    embed
      .setTitle("Retour vers la surface")
      .setDescription("Les pas quittent la pierre humide du donjon. L'expedition prend fin.")
      .setColor("DarkGreen")
      .setFooter({ text: "Le calme de la surface remplace l'echo des profondeurs." });
    return embed;
  }

  if (outcome.type === "expedition_turn" || outcome.type === "fight") {
    if (Array.isArray(outcome.divineNarrations) && outcome.divineNarrations.length) {
      embed.addFields({
        name: "Narration",
        value: outcome.divineNarrations.join("\n").slice(0, 1024),
        inline: false,
      });
    }

    if (Array.isArray(outcome.lootLines) && outcome.lootLines.length) {
      embed.addFields({
        name: "Fouilles et trouvailles",
        value: outcome.lootLines.join("\n").slice(0, 1024),
        inline: false,
      });
    }

    if (outcome.movementNote) {
      embed.addFields({
        name: "Marche du groupe",
        value: outcome.movementNote.slice(0, 1024),
        inline: false,
      });
    }

    if (outcome.type === "fight") {
      if (isBossFight) {
        embed
          .setTitle(`BOSS - ${outcome.monster.name}`)
          .setDescription(
            outcome.encounterNarration ||
              "Une forte presence ecrase l'air. Ce n'est pas une simple rencontre: c'est un BOSS."
          )
          .setFooter({ text: "Combat majeur obligatoire." });
        if (outcome.monster.image) {
          embed.setThumbnail(outcome.monster.image);
        }
      } else {
        embed
          .setTitle(`Chronique du Donjon - etage ${outcome.floor} (combat)`)
          .setDescription(
            outcome.encounterNarration ||
              "Un souffle hostile coupe la route. Les lames doivent parler avant toute avancee."
          )
          .setFooter({ text: "Le donjon reclame un combat." });
      }
    } else {
      embed.setFooter({ text: "Le tour est scelle. Le destin attend la prochaine decision." });
    }
    return embed;
  }

  if (outcome.monster) {
    embed.addFields({
      name: "Monstre",
      value: `${outcome.monster.name} (Lv ${outcome.monster.level})`,
      inline: true,
    });
    if (outcome.monster.image) {
      embed.setImage(outcome.monster.image);
    }
  }

  if (outcome.loot?.summary) {
    embed.addFields({ name: "Butin", value: outcome.loot.summary, inline: true });
  }

  return embed;
}
