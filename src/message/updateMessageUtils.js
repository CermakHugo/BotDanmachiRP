import { ActionRowBuilder } from "discord.js";

/**
 * Met à jour le message de combat avec un nouvel embed et de nouveaux composants.
 * On édite le message en une seule opération pour s'assurer que l'embed se met bien à jour.
 */
export async function updateMessageAndState(interaction, originalMessage, embed, components, combatState = null) {
  console.log("🔄 Mise à jour du message de combat...");

  // S'assurer que originalMessage est défini et éditable
  if (!originalMessage || typeof originalMessage.edit !== "function") {
    console.warn("originalMessage non défini ou invalide, récupération via fetchReply()...");
    originalMessage = await interaction.fetchReply();
  }

  // S'assurer que components est un tableau plat de composants
  const validComponents = Array.isArray(components[0]) ? components[0] : components;
  
  // Affichage de debug pour vérifier l'embed et les composants mis à jour
  console.log("Embed mis à jour :", embed);
  console.log("Composants mis à jour :", validComponents);

  // Mise à jour du message en une seule opération
  const updatedMessage = await originalMessage.edit({ embeds: [embed], components: validComponents });

  // Préparer et mettre à jour l'état de l'interaction
  const newData = { message: updatedMessage };
  if (combatState) newData.combat = combatState;

  if (combatState && combatState.monster && combatState.monster.hp > 0) {
    interaction.client.activeInteractions.set(interaction.user.id, newData);
    console.log("Combat en cours, interaction mise à jour.");
  } else {
    console.log("✅ Combat terminé ou combatState non valide, suppression de l'exploration !");
    interaction.client.activeInteractions.delete(interaction.user.id);
  }

  return updatedMessage;
}
