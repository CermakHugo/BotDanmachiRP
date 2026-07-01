import {SlashCommandBuilder} from 'discord.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong'),
    async execute(commandInteraction) {
        await commandInteraction.reply(`Ping : ${commandInteraction.client.ws.ping}`)
    }
}