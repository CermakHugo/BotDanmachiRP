import { EmbedBuilder } from "discord.js";

function formatPrice(price) {
  return `${price} valis`;
}

export function buildMarketListEmbed(listings, actorName) {
  if (!listings.length) {
    return {
      content: `${actorName} parcourt les etals mais ne trouve aucune annonce active.`,
      ephemeral: true,
    };
  }

  const embed = new EmbedBuilder()
    .setTitle("Bazar des Aventuriers")
    .setDescription("La place marchande bourdonne et les crieurs annoncent leurs prix.");

  for (const listing of listings) {
    embed.addFields({
      name: `#${listing.id} - ${listing.itemName}`,
      value: `Vendu par **${listing.sellerName}** — ${listing.quantity} piece(s) pour ${formatPrice(listing.price)}`,
    });
  }

  return { embeds: [embed] };
}

export function buildListingConfirmation(listing) {
  const embed = new EmbedBuilder()
    .setTitle("Annonce publiee")
    .setDescription(`Ton stand affiche desormais **${listing.itemName}** (${listing.quantity}) pour ${formatPrice(listing.price)}.`)
    .setFooter({ text: "Le courtier griffonne les details dans son registre." });
  return { embeds: [embed], ephemeral: true };
}

export function buildPurchaseReceipt(listing) {
  const embed = new EmbedBuilder()
    .setTitle("Transaction conclue")
    .setDescription(`Tu repars avec **${listing.itemName}** pendant que ${listing.sellerName} compte ses pieces.`)
    .addFields({ name: "Prix", value: formatPrice(listing.price), inline: true });
  return { embeds: [embed], ephemeral: true };
}

export function buildNpcCatalogEmbed(vendor, items) {
  const embed = new EmbedBuilder()
    .setTitle(vendor.name)
    .setDescription(vendor.greeting);

  if (!items.length) {
    embed.addFields({ name: "Echoppe vide", value: "Rien n'est expose pour le moment." });
  } else {
    for (const item of items) {
      const stock = item.stock === null ? "infini" : `${item.stock}`;
      embed.addFields({
        name: `${item.name} — ${formatPrice(item.price)}`,
        value: `${item.description || ""}\nStock: ${stock}\nID: ${item.id}`,
      });
    }
  }

  return { embeds: [embed] };
}

export function buildNpcPurchaseReceipt(vendor, item) {
  const embed = new EmbedBuilder()
    .setTitle(`${vendor.name} - Achat`)
    .setDescription(`<< ${vendor.greeting} >>`)
    .addFields(
      { name: "Objet", value: item.name, inline: true },
      { name: "Prix", value: formatPrice(item.price), inline: true }
    );
  return { embeds: [embed], ephemeral: true };
}



