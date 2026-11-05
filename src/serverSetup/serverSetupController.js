import { MessageFlags } from "discord.js";
import * as serverSetupService from "./serverSetupService.js";
import * as serverSetupView from "./serverSetupView.js";

export async function setupServer(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const guildId = interaction.guildId || null;
    let guild = interaction.guild || null;
    if (!guild && guildId) {
      guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
    }
    if (!guild) {
      return interaction.editReply({
        content:
          "Je ne peux pas creer les salons car le bot n'est pas present dans ce serveur. " +
          "Invite le bot (scope `bot`, pas seulement l'application) et donne-lui `Gerer les salons`, puis reessaie.",
      });
    }

    const template = interaction.options?.getString("template") || "default";
    const dryRun = interaction.options?.getBoolean("dry_run") || false;

    await import("./serverSetupModel.js");
    await import("./serverSetupDbRoute.js");

    const report = await serverSetupService.setupServerStructure(guild, { template, dryRun });
    const view = serverSetupView.buildSetupSummary(report);
    return interaction.editReply(view);
  } catch (error) {
    return interaction.editReply({ content: error?.message || "Impossible de configurer le serveur." });
  }
}

export default { setupServer };
