import * as helpService from "./helpService.js";
import * as helpView from "./helpView.js";

function reply(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

export async function showHelp(interaction, topic) {
  const content = helpService.getHelpContent(topic);
  const message = helpView.buildHelpEmbed(content);
  return reply(interaction, message);
}

export default {
  showHelp,
};
