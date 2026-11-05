import { EmbedBuilder } from "discord.js";

function formatPrice(price) {
  return `${price} valis`;
}

function sizeLabel(size) {
  if (size === "petit") return "petit";
  if (size === "moyen") return "moyen";
  if (size === "grand") return "grand";
  if (size === "colossal") return "colossal";
  return "inconnu";
}

export function buildCrystalExchangeReceipt(result) {
  const embed = new EmbedBuilder()
    .setTitle("Guilde - Echange de Crystal Shards")
    .setDescription("La guilde inspecte tes fragments et te verse ta recompense.")
    .addFields(
      { name: "Fragments echanges", value: String(result.totalQuantity), inline: true },
      { name: "Total recu", value: formatPrice(result.totalValis), inline: true }
    )
    .setColor("#9b59b6")
    .setTimestamp();

  const lines = (result.details || []).slice(0, 10).map((entry) =>
    `- ${entry.name} (${sizeLabel(entry.size)}): ${entry.quantity} x ${entry.unitPrice} = ${entry.subtotal} valis`
  );

  if (lines.length) {
    embed.addFields({ name: "Details", value: lines.join("\n") });
  }

  return { embeds: [embed] };
}

