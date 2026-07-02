import { readdirSync } from "fs";

export const loadInteractions =  async (bot) => {
  const categories = ["modals", "select_menus", "buttons"];
  bot.interactions = []; // On utilise un tableau pour stocker tous les modules d'interaction

  for (const category of categories) {
    const interactionsPath = `./interactions/${category}`
    const files = readdirSync(interactionsPath).filter(file => file.endsWith(".js"));
    for (const file of files) {
      try {
        const filePath = `../interactions/${category}/${file}`;
        const interactionModule = await import(filePath);
        const interaction = interactionModule.default || interactionModule;
        if (interaction && (interaction.customId || interaction.pattern)) {
          console.log(`✅ Interaction ajoutée : ${file}`);
          await bot.interactions.push(interaction);
        } else {
          console.warn(`⚠️ Interaction was ignored : ${file} (customId or pattern missing)`);
        }
      } catch (err) {
        console.error(`❌ Error during load of ${file}:`, err);
      }
    }
  }
  console.log(`✅ ${bot.interactions.length} interactions loaded.`);
};