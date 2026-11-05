import * as GuildeService from "./guildeService.js";
import * as GuildeView from "./guildeView.js";
import * as ServerSetupService from "../serverSetup/serverSetupService.js";

const GUILDE_EXCHANGE_CHANNEL_KEY = "channel:guilde:inscription";
const MANUAL_GUILDE_EXCHANGE_CHANNEL_ID = "1474720651859464347";

export async function exchangeCrystalShards(interaction) {
  const size = interaction.options.getString("taille") || "all";

  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: "Cette commande doit etre utilisee dans un serveur.",
        ephemeral: true,
      });
    }

    const setupChannelId = await ServerSetupService.getServerChannelId(
      interaction.guildId,
      GUILDE_EXCHANGE_CHANNEL_KEY
    );
    const allowedChannelId = (MANUAL_GUILDE_EXCHANGE_CHANNEL_ID || "").trim() || setupChannelId || null;

    if (!allowedChannelId) {
      return interaction.reply({
        content: "Le salon de guilde n'est pas configure. Lance /setup_server ou renseigne MANUAL_GUILDE_EXCHANGE_CHANNEL_ID.",
        ephemeral: true,
      });
    }

    if (interaction.channelId !== allowedChannelId) {
      return interaction.reply({
        content: `Utilise cette commande dans <#${allowedChannelId}>.`,
        ephemeral: true,
      });
    }

    const result = await GuildeService.exchangeCrystalShards(interaction.user.id, { size });
    const payload = GuildeView.buildCrystalExchangeReceipt(result);
    return interaction.reply(payload);
  } catch (error) {
    console.error("[guildeController] exchangeCrystalShards", error);
    return interaction.reply({
      content: error.message || "Impossible d'echanger tes Crystal Shards.",
      ephemeral: true,
    });
  }
}
