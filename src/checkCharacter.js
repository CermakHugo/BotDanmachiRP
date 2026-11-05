import { Character } from "../database/models.js";

async function checkCharacter(interaction) {
  const userId = interaction.user.id;
  const character = await Character.findOne({ where: { userId } });

  if (!character) {
    await interaction.reply({ content: "❌ Tu dois d'abord créer un personnage avec `/creer_personnage` avant d'utiliser cette commande !", ephemeral: true });
    return false;
  }

  return true;
}

export default { checkCharacter };
