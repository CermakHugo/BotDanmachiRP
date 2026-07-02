import {Collection, IntentsBitField, Client, Events, REST, Routes} from 'discord.js';
import {loadCommands} from './loaders/loadCommands.js';
import {sequelize} from './database.js';
import 'dotenv/config';
import { loadEvents } from './loaders/loadEvents.js';
import { loadInteractions } from './loaders/loadInteractions.js';
const intents = new IntentsBitField(process.env.INTENTS_BIT_FIELD);
const bot = new Client({intents});

try {
  await sequelize.authenticate();
  console.log('Connection has been established successfully.');
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

bot.commands = new Collection();


const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    await loadInteractions(bot);
    await loadCommands(bot);
    await loadEvents(bot);
    try {
        const commands = [...bot.commands.values()].map(command => {
            return command.data.toJSON();
        });
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(Routes.applicationGuildCommands(process.env.BOT_ID, process.env.GUILD_ID), { body: commands });
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
            // And of course, make sure you catch and log any errors!
            console.error(error);
    }
})();



await bot.login(process.env.TOKEN);

bot.on('ready', async () => {
    console.log(`${bot.user.username} est en ligne.`)
})