import {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export function renderItem(item) {
  const embed = new EmbedBuilder()
    .setTitle(item.name)
    .setDescription(item.description || "Aucune description.")
    .addFields(
      { name: "Identifiant", value: `${item.id}`, inline: true },
      { name: "Categorie", value: `${item.category || "ressource"}`, inline: true }
    );

  if (item.category === "weapon") {
    embed.addFields(
      { name: "Degats", value: `${item.damage ?? 0}`, inline: true },
      { name: "Durabilite", value: `${item.durability ?? 100}`, inline: true },
      { name: "Malus dexterite", value: `${item.dexterityMalus ?? 0}`, inline: true }
    );
  }

  if (item.category === "armor") {
    embed.addFields(
      { name: "Resistance", value: `${item.resistance ?? 0}`, inline: true },
      { name: "Durabilite", value: `${item.durability ?? 100}`, inline: true },
      { name: "Malus agilite", value: `${item.agilityMalus ?? 0}`, inline: true }
    );
  }

  return { embeds: [embed] };
}

export function renderItemWithEffects(item) {
  return renderItem(item);
}

export function buildCreateItemModal() {
  const modal = new ModalBuilder().setCustomId("create_item_modal").setTitle("Creer un objet");

  const nameInput = new TextInputBuilder()
    .setCustomId("item_name")
    .setLabel("Nom de l'objet")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const descInput = new TextInputBuilder()
    .setCustomId("item_description")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(descInput)
  );

  return modal;
}

export function parseCreateItemModal(interaction) {
  return {
    name: interaction.fields.getTextInputValue("item_name"),
    description: interaction.fields.getTextInputValue("item_description") || "",
  };
}
