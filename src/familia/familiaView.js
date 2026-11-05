import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";

function formatDate(date) {
  if (!date) return "Inconnue";
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:R>`;
}

export function buildElectionAnnouncement(familia, election, members = []) {
  const embed = new EmbedBuilder()
    .setTitle(`Election de capitaine - ${familia.name}`)
    .setDescription(
      "Une nouvelle election democratique commence !\n" +
        "Vote avec la commande `/familia_vote` en indiquant ton candidat."
    )
    .addFields(
      { name: "Raison", value: election.reason, inline: true },
      { name: "Fin du vote", value: formatDate(election.endAt), inline: true }
    );

  const sortedMembers = members
    .slice()
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
  const maxDisplayed = 10;
  const lines = sortedMembers.slice(0, maxDisplayed).map(member => {
    const level = member.level ?? 1;
    const name = member.name || member.userId || "Inconnu";
    return `- ${name} (Lv ${level})`;
  });

  if (lines.length === 0) {
    lines.push("Aucun aventurier inscrit pour le moment.");
  } else if (sortedMembers.length > maxDisplayed) {
    lines.push(`... et ${sortedMembers.length - maxDisplayed} autre(s) membre(s)`);
  }

  embed.addFields({
    name: "Participants admissibles",
    value: lines.join("\n").slice(0, 1024),
    inline: false,
  });

  return { embeds: [embed] };
}

export function buildElectionResult(familia, election, winner) {
  const description = winner
    ? `Le nouveau capitaine est **${winner.name}**.`
    : "Aucun vainqueur n'a pu etre determine. Un nouveau vote sera programme.";
  const embed = new EmbedBuilder()
    .setTitle(`Resultat - ${familia.name}`)
    .setDescription(description)
    .addFields(
      { name: "Fin du vote", value: formatDate(election.endAt), inline: true },
      { name: "Votes totals", value: `${election.winnerId ? "Election validee" : "Annulee"}`, inline: true }
    );
  return { embeds: [embed] };
}

export function buildFamiliaInfo({ familia, memberCount, captain, election }) {
  const embed = new EmbedBuilder()
    .setTitle(`Familia ${familia?.name || "Inconnue"}`)
    .addFields({ name: "Membres", value: `${memberCount}`, inline: true });

  if (captain) {
    embed.addFields({
      name: "Capitaine actuel",
      value: `${captain.name} (depuis ${formatDate(familia.captainAssignedAt)})`,
      inline: false,
    });
  } else {
    embed.addFields({ name: "Capitaine actuel", value: "Aucun", inline: false });
  }

  if (election) {
    embed.addFields({
      name: "Election en cours",
      value: `Raison: ${election.reason}\nFin: ${formatDate(election.endAt)}`,
      inline: false,
    });
  }

  return { embeds: [embed] };
}

export function buildJoinWelcomeEmbed({ familiaName, userMention, characterName }) {
  const embed = new EmbedBuilder()
    .setTitle(`Bienvenue dans la Familia ${familiaName}`)
    .setDescription(
      `${userMention} rejoint officiellement la familia.\n\n` +
      `**Aventure en cours:** ${characterName} debute son parcours sous la benediction de ${familiaName}.`
    )
    .setColor("#f1c40f")
    .setTimestamp();
  return { embeds: [embed] };
}

export function buildStartingWeaponRow({ userId, weapons }) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`familia_start_weapon:user=${userId}`)
    .setPlaceholder("Choisis ton arme de depart")
    .addOptions(
      weapons.map((w) => ({
        label: (w.name || "Arme").toString().slice(0, 25),
        description: `Degats: ${Number(w.damage || 0)}`.slice(0, 50),
        value: String(w.id),
      }))
    );

  return new ActionRowBuilder().addComponents(menu);
}

export function buildJoinAcceptedReply({ characterName, chosenGod, aiResponse }) {
  return {
    content:
      `**${characterName}**, tu as ete accepte(e) par **${chosenGod}** !\n\n*${aiResponse}*\n\n` +
      "Va dans le salon discussion de ta familia: le choix d'arme a ete poste juste sous ton message de bienvenue.",
  };
}

export function buildJoinRefusedReply({ chosenGod, aiResponse }) {
  return {
    content: `**${chosenGod}** a refuse ta demande.\n\n*${aiResponse}*`,
  };
}
