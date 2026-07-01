import * as fs from 'fs';

export const loadCommands = async (bot) => {
    const files = fs.readdirSync('./commandes').filter(f => f.endsWith('.js'))
    for(const file of files){
        const { command } = await import (`../commandes/${files}`)
        if(!('data' in command) || !('execute' in command)) 
            throw new TypeError(`La commande ${file.slice(0, file.lenght-3)} n'a pas de nom ou d'execution`)

        bot.commands.set(command.data.name, command)
        console.log(`Commande ${file} chargé avec succès`)
    }
}