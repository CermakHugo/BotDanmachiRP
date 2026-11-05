import { EmbedBuilder } from "discord.js";

export function buildHelpEmbed(content) {
  const embed = new EmbedBuilder()
    .setTitle(content.title || "Aide")
    .setDescription(content.description || "Aucune information disponible.")
    .setColor("#3498db")
    .setTimestamp();

  const fields = Array.isArray(content.fields) ? content.fields : [];
  for (const field of fields) {
    if (!field?.name || !field?.value) continue;
    embed.addFields({ name: field.name, value: field.value, inline: false });
  }

  return { embeds: [embed], ephemeral: true };
}

export default {
  buildHelpEmbed,
};
