import 'discord.js';

export const command = {
    name: 'ping',
    async run(bot, message) {
        await message.reply(`Ping : ${bot.ws.ping}`)
    }
}