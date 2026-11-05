import * as ShopService from "./shopService.js";
import * as ShopView from "./shopView.js";

function displayName(interaction) {
  return interaction.member?.displayName || interaction.user.username;
}

export async function showMarket(interaction) {
  try {
    const listings = await ShopService.listActiveListings();
    const payload = ShopView.buildMarketListEmbed(listings, displayName(interaction));
    return interaction.reply(payload);
  } catch (error) {
    console.error("[shopController] showMarket", error);
    return interaction.reply({ content: error.message || "Impossible de consulter la place marchande.", ephemeral: true });
  }
}

export async function sellItem(interaction) {
  const itemName = interaction.options.getString("item");
  const price = interaction.options.getInteger("prix");
  const quantity = interaction.options.getInteger("quantite") || 1;

  try {
    const listing = await ShopService.createListing({
      sellerId: interaction.user.id,
      sellerName: displayName(interaction),
      itemName,
      quantity,
      price,
    });
    const payload = ShopView.buildListingConfirmation(listing);
    return interaction.reply(payload);
  } catch (error) {
    console.error("[shopController] sellItem", error);
    return interaction.reply({ content: error.message || "Impossible de publier cette annonce.", ephemeral: true });
  }
}

export async function buyListing(interaction) {
  const listingId = interaction.options.getInteger("annonce");
  try {
    const listing = await ShopService.buyListing(listingId, {
      buyerId: interaction.user.id,
      buyerName: displayName(interaction),
    });
    const payload = ShopView.buildPurchaseReceipt(listing);
    return interaction.reply(payload);
  } catch (error) {
    console.error("[shopController] buyListing", error);
    return interaction.reply({ content: error.message || "Impossible d'acheter cette annonce.", ephemeral: true });
  }
}

export async function showNpcCatalog(interaction) {
  const npcKey = interaction.options.getString("vendeur");
  try {
    const vendor = ShopService.getNpcVendor(npcKey);
    if (!vendor) {
      return interaction.reply({ content: "Ce marchand est inconnu.", ephemeral: true });
    }
    const items = await ShopService.listNpcItems(npcKey);
    const payload = ShopView.buildNpcCatalogEmbed(vendor, items);
    return interaction.reply(payload);
  } catch (error) {
    console.error("[shopController] showNpcCatalog", error);
    return interaction.reply({ content: error.message || "Le marchand refuse de devoiler son etal.", ephemeral: true });
  }
}

export async function buyNpcItem(interaction) {
  const npcKey = interaction.options.getString("vendeur");
  const itemId = interaction.options.getInteger("article");
  try {
    const result = await ShopService.buyNpcItem(itemId, {
      npcKey,
      buyerId: interaction.user.id,
      buyerName: displayName(interaction),
    });
    const payload = ShopView.buildNpcPurchaseReceipt(result.vendor, result.item);
    return interaction.reply(payload);
  } catch (error) {
    console.error("[shopController] buyNpcItem", error);
    return interaction.reply({ content: error.message || "L'echange a echoue.", ephemeral: true });
  }
}
