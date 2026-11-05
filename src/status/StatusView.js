import { EmbedBuilder, MessageFlags } from "discord.js";

export function buildUpdatedStatusEmbed(godness, godnessResponse, progressInfoAfter){  
    return new EmbedBuilder()
    .setTitle("Benediction Divine")
    .setThumbnail(godness.image)
    .setDescription(godnessResponse)
    .addFields({ name: "Statistiques appliquees :", value: progressInfoAfter })
    .setColor("Gold")
    .setFooter({ text: "Utilise tes nouvelles capacites pour aller plus loin dans le donjon." });
}

export async function showUpdatedStatusAfterDiffer(interaction, embeds){
    return await interaction.editReply({ embeds: [...embeds] });
}

export async function showEmbed(interaction, embed){
    return await interaction.reply({ embeds: [embed] });
}

export async function printEphemeralMessage(interaction, messageContent){
    return await interaction.reply({content: messageContent, flags: MessageFlags.Ephemeral});
}

function computeRankFromValue(value) {
  const n = Number(value) || 0;
  if (n >= 900) return "S";
  if (n >= 800) return "A";
  if (n >= 700) return "B";
  if (n >= 600) return "C";
  if (n >= 500) return "D";
  if (n >= 400) return "E";
  if (n >= 300) return "F";
  if (n >= 200) return "G";
  if (n >= 100) return "H";
  return "I";
}

function pickRank(rankValue, numericValue) {
  const rankText = (rankValue || "").toString().trim();
  if (rankText.length > 0) return rankText;
  return computeRankFromValue(numericValue);
}

export function buildCharacterStatsEmbed(payload) {
  const safeStatEmojis = {
    strength: payload?.statEmojis?.strength || "??",
    agility: payload?.statEmojis?.agility || "??",
    endurance: payload?.statEmojis?.endurance || "???",
    intelligence: payload?.statEmojis?.intelligence || "??",
    dexterity: payload?.statEmojis?.dexterity || "??",
  };

  const safeNumericStats = {
    strength: Number(payload?.numericStats?.strength || 0),
    agility: Number(payload?.numericStats?.agility || 0),
    endurance: Number(payload?.numericStats?.endurance || 0),
    intelligence: Number(payload?.numericStats?.intelligence || 0),
    dexterity: Number(payload?.numericStats?.dexterity || 0),
  };

  const safeRankStats = {
    strength: pickRank(payload?.rankStats?.strength, safeNumericStats.strength),
    agility: pickRank(payload?.rankStats?.agility, safeNumericStats.agility),
    endurance: pickRank(payload?.rankStats?.endurance, safeNumericStats.endurance),
    intelligence: pickRank(payload?.rankStats?.intelligence, safeNumericStats.intelligence),
    dexterity: pickRank(payload?.rankStats?.dexterity, safeNumericStats.dexterity),
  };

  const embed = new EmbedBuilder()
    .setTitle("Statut de " + payload.targetDisplayName)
    .setColor(payload.isSelf ? "#f1c40f" : "#3498db")
    .addFields(
      { name: "Etat de sante", value: payload.healthState, inline: false },
      { name: "Familia", value: payload.familia || "Aucune", inline: true },
      { name: "Niveau", value: String(payload.level || 1), inline: true }
    )
    .setTimestamp();

  const thumbnailUrl = (payload?.appearanceUrl || "").toString().trim();
  if (/^https?:\/\//i.test(thumbnailUrl)) {
    embed.setThumbnail(thumbnailUrl);
  }

  if (payload.isSelf) {
    embed.addFields({
      name: "Statistiques",
      value:
        safeStatEmojis.strength + " Force: " + safeNumericStats.strength + " " + safeRankStats.strength + "\n" +
        safeStatEmojis.agility + " Agilite: " + safeNumericStats.agility + " " + safeRankStats.agility + "\n" +
        safeStatEmojis.endurance + " Endurance: " + safeNumericStats.endurance + " " + safeRankStats.endurance + "\n" +
        safeStatEmojis.intelligence + " Intelligence: " + safeNumericStats.intelligence + " " + safeRankStats.intelligence + "\n" +
        safeStatEmojis.dexterity + " Dexterite: " + safeNumericStats.dexterity + " " + safeRankStats.dexterity,
      inline: false,
    });
  } else {
    embed.addFields({
      name: "Statistiques visibles",
      value:
        safeStatEmojis.strength + " " + safeRankStats.strength + "\n" +
        safeStatEmojis.agility + " " + safeRankStats.agility + "\n" +
        safeStatEmojis.endurance + " " + safeRankStats.endurance + "\n" +
        safeStatEmojis.intelligence + " " + safeRankStats.intelligence + "\n" +
        safeStatEmojis.dexterity + " " + safeRankStats.dexterity,
      inline: false,
    });
  }

  return { embeds: [embed], ephemeral: false };
}
