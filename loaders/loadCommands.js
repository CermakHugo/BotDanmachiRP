import * as fs from 'fs';

export const loadCommands = async (bot) => {
    fs.readdirSync('./commandes').filter(f => f.endsWith('.js')).forEach(async file => {
        const { command } = await import (`../commandes/${file}`)
        if(!command.name || typeof command.name !== "string") 
            throw new TypeError(`La commande ${file.slice(0, file.lenght-3)} n'a pas de nom`)

        bot.commands.set(command.name, command)
        console.log(`Commande ${file} chargé avec succès`)
    })
}