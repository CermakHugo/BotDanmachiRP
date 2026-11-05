import { Character } from "../../database/models.js";
import { getInventory, ensureInventory } from "./inventoryService.js";
import * as InventoryView from "./inventoryView.js";

async function resolveCharacter(userId) {
  return Character.findOne({ where: { userId } });
}

export async function showInventory(interaction, targetUserId = null) {
  const userId = targetUserId || interaction.user.id;
  const character = await resolveCharacter(userId);
  if (!character) {
    return interaction.reply({ content: "Ce personnage n'existe pas.", ephemeral: true });
  }

  const inventory = (await getInventory(character.characterId)) || (await ensureInventory(character.characterId));
  const payload = InventoryView.buildInventoryEmbed(character, inventory);
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

export async function creditMoney(characterId, amount) {
  const inventory = await ensureInventory(characterId);
  inventory.money += amount;
  return inventory.save();
}

export default { showInventory, creditMoney };
