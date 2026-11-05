import { MessageFlags } from "discord.js";
import * as itemService from "./itemService.js";
import * as itemView from "./itemView.js";

function buildEphemeral(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

export async function showCreateItemModal(interaction) {
  const modal = itemView.buildCreateItemModal();
  await interaction.showModal(modal);
}

export async function createItemFromCommand(interaction) {
  try {
    const name = interaction.options.getString("nom", true);
    const description = interaction.options.getString("description") || "";
    const category = interaction.options.getString("type", true);
    const damage = interaction.options.getInteger("damage");
    const resistance = interaction.options.getInteger("resistance");
    const durability = interaction.options.getInteger("durability");
    const dexterityMalus = interaction.options.getInteger("malus_dexterity");
    const agilityMalus = interaction.options.getInteger("malus_agility");

    const item = await itemService.createItem({
      name,
      description,
      category,
      damage,
      resistance,
      durability,
      dexterityMalus,
      agilityMalus,
    });

    const payload = itemView.renderItem(item);
    await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  } catch (error) {
    await interaction.reply(buildEphemeral(error.message || "Impossible de creer l'objet."));
  }
}

export async function handleCreateItemModal(interaction) {
  try {
    const { name, description } = itemView.parseCreateItemModal(interaction);
    const item = await itemService.createItem({ name, description });
    const payload = itemView.renderItem(item);
    await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  } catch (error) {
    await interaction.reply(buildEphemeral(error.message || "Impossible de creer l'objet."));
  }
}

export async function showItem(interaction, identifier) {
  try {
    const item = await itemService.findItem(identifier);
    const view = itemView.renderItem(item);
    await interaction.reply({ ...view, flags: MessageFlags.Ephemeral });
  } catch (error) {
    await interaction.reply(buildEphemeral(error.message || "Objet introuvable."));
  }
}

export async function addEffect(interaction) {
  await interaction.reply(
    buildEphemeral("Les effets d'items ont ete retires (tables Item/ItemEffect supprimees).")
  );
}
