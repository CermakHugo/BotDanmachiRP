import { EmbedBuilder } from "discord.js";

function normalizeType(itemType) {
  const normalizedItemType = (itemType || "").toString().trim().toLowerCase();
  if (normalizedItemType === "weapon" || normalizedItemType === "weapons") return "Armes";
  if (normalizedItemType === "armor" || normalizedItemType === "armure") return "Armures";
  if (normalizedItemType === "consumable" || normalizedItemType === "consommable") return "Consommables";
  if (normalizedItemType === "ressource" || normalizedItemType === "resource" || normalizedItemType === "materiau") return "Ressources";
  return "Divers";
}

function formatItemLine(item) {
  const itemQuantity = Number(item?.quantity || 0);
  const itemReferenceLabel = item?.refId ? ` \`(${item.refId})\`` : "";
  return `• ${item?.name || "Objet inconnu"} x${itemQuantity}${itemReferenceLabel}`;
}

function buildGroupedItemLines(items) {
  const groups = new Map();

  for (const item of items || []) {
    const key = normalizeType(item?.itemType);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const orderedKeys = ["Armes", "Armures", "Consommables", "Ressources", "Divers"];
  const lines = [];

  for (const key of orderedKeys) {
    const list = groups.get(key) || [];
    if (!list.length) continue;
    lines.push(`**${key}**`);
    for (const item of list.slice(0, 8)) {
      lines.push(formatItemLine(item));
    }
    if (list.length > 8) {
      lines.push(`… et ${list.length - 8} autre(s) objet(s)`);
    }
  }

  return lines.length ? lines : ["Aucun objet"];
}

export function buildInventoryEmbed(character, inventory) {
  const money = Number(inventory?.money ?? 0);
  const items = inventory?.InventoryItems || inventory?.items || [];
  const lines = buildGroupedItemLines(items);
  const totalItems = items.reduce((acc, it) => acc + (Number(it?.quantity) || 0), 0);

  const embed = new EmbedBuilder()
    .setTitle(`Inventaire • ${character.name}`)
    .setDescription("Ton sac et tes ressources actuelles.")
    .setColor("#d4af37")
    .addFields(
      { name: "Bourse", value: `💰 ${money} valis`, inline: true },
      { name: "Total objets", value: `📦 ${totalItems}`, inline: true },
      { name: "Contenu", value: lines.join("\n").slice(0, 1024), inline: false }
    )
    .setFooter({ text: `ID personnage: ${character.characterId}` })
    .setTimestamp();

  return { embeds: [embed], ephemeral: true };
}

export function buildMissingInventoryMessage() {
  return { content: "Impossible de trouver cet inventaire.", ephemeral: true };
}
