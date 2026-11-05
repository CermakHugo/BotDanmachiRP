import { EmbedBuilder } from "discord.js";

function formatChannel(entry) {
  const prefix = entry.type === "voice" ? "🔊" : entry.type === "category" ? "📁" : "💬";
  const status = entry.created ? "cree" : "existe";
  return `${prefix} ${entry.name} (${status})`;
}

export function buildSetupSummary(report) {
  const lines = [];
  for (const category of report.categories || []) {
    const status = category.created ? "cree" : "existe";
    lines.push(`**${category.name}** (${status})`);
    for (const channel of category.channels || []) {
      lines.push(`- ${formatChannel(channel)}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("Setup serveur")
    .setDescription(lines.join("\n").slice(0, 4000) || "Aucun changement.")
    .addFields(
      { name: "Template", value: String(report.template || "default"), inline: true },
      { name: "Dry-run", value: report.dryRun ? "oui" : "non", inline: true },
      { name: "Creations", value: String(report.createdCount || 0), inline: true }
    )
    .setColor(report.dryRun ? 0x999999 : 0x2ecc71);

  return { embeds: [embed] };
}

export default { buildSetupSummary };
