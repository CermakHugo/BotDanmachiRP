import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export async function getCombatButtons(stateKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`explore_action_continue_${stateKey}`)
      .setLabel("Continuer le combat")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`explore_action_exit_${stateKey}`)
      .setLabel("Fuir le donjon")
      .setStyle(ButtonStyle.Danger)
  );
}

export default { getCombatButtons };
