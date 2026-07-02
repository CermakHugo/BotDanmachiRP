import { EmbedBuilder, MessageFlags } from "discord.js";

export function buildUpdatedStatusEmbed(godness, godnessResponse, progressInfoAfter){  
    return new EmbedBuilder()
    .setTitle("Benediction Divine")
    .setThumbnail(godness.image)
    .setDescription(godnessResponse)
    .addFields({ name: "Statistiques appliquees :", value: progressInfoAfter })
    .setColor("Gold")
    .setFooter({ text: "Utilise tes nouvelles capacités pour aller plus loin dans le donjon." });
}

export async function showUpdatedStatusAfterDiffer(interaction, embeds){
    return await interaction.editReply({ embeds: [...embeds] });
}

export async function showEmbed(interaction, embed){
    return await interaction.reply({ embeds: [embed] });
}

export async function printEphemeralMessage(interaction, messageContent){
    return await interaction.reply({content: messageContent, flags: MessageFlags.Ephemeral});
}