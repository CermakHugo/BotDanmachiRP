import {Collection, IntentsBitField, Client} from 'discord.js';
import {loadCommands} from './loaders/loadCommands.js';
import {sequelize} from './database.js';
import 'dotenv/config';
const intents = new IntentsBitField(process.env.INTENTS_BIT_FIELD);
const bot = new Client({intents});

try {
  await sequelize.authenticate();
  console.log('Connection has been established successfully.');
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

bot.commands = new Collection();
bot.login(process.env.TOKEN);
loadCommands(bot);

bot.on("messageCreate", async message =>{
    if(message.content === "!ping") return bot.commands.get("ping").run(bot, message)
})

bot.on('ready', async () => {

    console.log(`${bot.user.username} est en ligne.`)
})