const discord = require('discord.js');
const config = require('./config');
const loadCommands = require('./loaders/loadCommands');
const intents = new discord.IntentsBitField(53608447);
const bot = new discord.Client({intents});

bot.commands = new discord.Collection();

bot.login(config.token);
loadCommands(bot);

bot.on("messageCreate", async message =>{
    if(message.content === "!ping") return bot.commands.get("ping").run(bot, message)
})

bot.on('ready', async () => {

    console.log(`${bot.user.username} est en ligne.`)
})