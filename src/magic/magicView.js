import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags, LabelBuilder, StringSelectMenuOptionBuilder, IntentsBitField } from "discord.js";

export function deferEphemeralReply(interaction){
    return interaction.deferReply({flags: MessageFlags.Ephemeral});
}

export function editReply(interaction, message){
    return interaction.editReply(message);
}

export function createAdminMessageForMagic(magic, effects){
    const embed = new EmbedBuilder()
    .setTitle(`${magic.name}`)
    .setDescription(`Description de  **${magic.name}** :`)
    .addFields(
        { name: "", value: `${magic.description}`, inline: true },
    )
    .setColor("#3250fd")

    effects.forEach(effect => {
        embed.addFields({name : `${effect.name}`, value : `${effect.description}`, inline : false})
    });

    return {embeds : [embed]};
}

export function createMessageForMagic(magic){
    const embed = new EmbedBuilder()
    .setTitle(`${magic.name}`)
    .setDescription(`Description de  **${magic.name}** :`)
    .addFields(
        { name: "", value: `${magic.description}`, inline: true },
    )
    .setColor("#3250fd")

    return {embeds : [embed]};
}

