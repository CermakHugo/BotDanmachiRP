import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";

export function createAdminMonsterEmbed(monster, status){
    const embed = new EmbedBuilder()
    .setTitle(`${monster.name}`)
    .setDescription(`Voici les caractéristiques de **${monster.name}** :`)
    .addFields(
        {name : "Description :", value : `${monster.description}`, inline: false},
        {name : "Floor Min :", value: `${monster.floorMin}`, inline: true},
        {name: "Floor Max :" , value : `${monster.floorMax}` , inline : true}
    )
    .addFields(
        {name : "⭐ Niveau :", value : `${status.level}`, inline : false},
        {name : `Statistiques :`, value: "\u200b", inline : false },
        {name : `💪 Force : ${status.strength}`, value : "\u200b", inline: true},
        {name : `🤸 Agilité : ${status.agility}`, value : "\u200b", inline: true}, 
        {name : `🎯 Dextérité : ${status.dexterity}`, value : "\u200b", inline: true}, 
        {name : `🧠 Intelligence : ${status.intelligence}`, value : "\u200b", inline: true}, 
        {name : `🛡️ Endurance : ${status.endurance}`, value : "\u200b", inline: true},  
        {name : `❤️ Santé :${monster.health}/ ${monster.maxHealth}` , value: "\u200b", inline: true},
    )
    .setImage(`${monster.appearance}`)
    .setColor("#2881e1")
    .setTimestamp();
    return embed;
}

export async function showEmbed(interaction, embed){
  return await interaction.editReply({ embeds: [embed]});
}

export async function deferReply(interaction){
    await interaction.deferReply({flags: MessageFlags.Ephemeral})
}

export async function printEphemeralMessage(interaction, messageContent){
  return await interaction.editReply({content: messageContent});
}

export async function showBestiaire(interaction, newMessage){
    try {
        if(!interaction.isButton()){
            return await interaction.reply(newMessage); 
        } else {
            return await interaction.update(newMessage);
        } 
    } catch (e) {
        console.log(`Message erreur : ${e} `);
        if(!interaction.isButton()){
            await interaction.deleteReply();
        }
        return;
    }
}

async function createMonsterKnowledgeEmbed(monster, status){
    const embed = new EmbedBuilder()
    .setTitle(`${monster.name}`)
    .setDescription(`Voici les caractéristiques de **${monster.name}** :`)
    .addFields(
        {name : "Description :", value : `${monster.description}`, inline: false},
        {name : "Floor Min :", value: `${monster.floorMin}`, inline: true},
        {name: "Floor Max :" , value : `${monster.floorMax}` , inline : true}
    )
    .addFields(
        {name : "⭐ Niveau :", value : `${status.level}`, inline : false},
        {name : `Statistiques :`, value: "\u200b", inline : false },
        {name : `💪 Force : ${status.strengthRank}`, value : "\u200b", inline: true},
        {name : `🤸 Agilité : ${status.agilityRank}`, value : "\u200b", inline: true}, 
        {name : `🎯 Dextérité : ${status.dexterityRank}`, value : "\u200b", inline: true}, 
        {name : `🧠 Intelligence : ${status.intelligenceRank}`, value : "\u200b", inline: true}, 
        {name : `🛡️ Endurance : ${status.enduranceRank}`, value : "\u200b", inline: true},
    )
    .setImage(`${monster.appearance}`)
    .setColor("#2881e1")
    .setTimestamp();

    return embed;
}

export async function createVoidMonsterKnowledgeEmbed(){
    const embed = new EmbedBuilder()
    .setTitle(`Bestiaire`)
    .setDescription(`Aucune Donnée sur les monstres du donjon`)
    .setColor("#2881e1")
    .setTimestamp();
    return embed;
}

async function createMonsterKnowledgeButtons(currentIndex, allMonstersKnowledge){
    const nextButton = new ButtonBuilder()
    .setCustomId(`bestiaire:i=${currentIndex+1}`)
    .setLabel("Suivant")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled((currentIndex == allMonstersKnowledge.length - 1 ) ? true : false );

    const previousButton = new ButtonBuilder()
    .setCustomId(`bestiaire:i=${currentIndex-1}`)
    .setLabel("Précédent")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled((currentIndex == 0) ? true : false);

    const buttons = new ActionRowBuilder().addComponents(previousButton, nextButton);
    return buttons;
}

export async function createMonsterKnowledgeMessage(options){
    const allMonstersKnowledge = options.allMonstersKnowledge
    const currentIndex = options.currentIndex;
    const monster = allMonstersKnowledge[currentIndex];
    const status = options.status;
    const monsterEmbed = await createMonsterKnowledgeEmbed(monster, status);
    const buttons = await createMonsterKnowledgeButtons(currentIndex, allMonstersKnowledge);
    
    const message = {
        embeds : [monsterEmbed],
        components: [buttons],
        withResponse: true,
        flags: MessageFlags.Ephemeral 
    }
    return message;
}



