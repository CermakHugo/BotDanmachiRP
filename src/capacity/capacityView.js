import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags, LabelBuilder, StringSelectMenuOptionBuilder, IntentsBitField } from "discord.js";

export function deferEphemeralReply(interaction){
    return interaction.deferReply({flags: MessageFlags.Ephemeral});
}

export function editReply(interaction, message){
    return interaction.editReply(message);
}

export function createAdminMessageForCapacity(capacity, effectsMap){
    console.log(`effectsMap is a map = ${effectsMap instanceof Map}`)
    const effects = [...effectsMap.keys()];
    const embed = new EmbedBuilder()
    .setTitle(`${capacity.name}`)
    .setDescription(`Description de  **${capacity.name}** :`)
    .addFields(
        { name: "", value: `${capacity.description}`, inline: true },
    )
    .setColor("#3250fd")

    effects.forEach(effect => {
        embed.addFields({name : `${effect.name}`, value : `${effect.description}\ncondition : ${effectsMap.get(effect)}`, inline : false})
    });

    return {embeds : [embed]};
}

export function createMessageForCapacity(capacity){
    const embed = new EmbedBuilder()
    .setTitle(`${capacity.name}`)
    .setDescription(`Description de  **${capacity.name}** :`)
    .addFields(
        { name: "", value: `${capacity.description}`, inline: true },
    )
    .setColor("#3250fd")

    return {embeds : [embed]};
}

