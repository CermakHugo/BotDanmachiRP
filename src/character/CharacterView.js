import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags, LabelBuilder, StringSelectMenuOptionBuilder } from "discord.js";

const races = [
    {
        name :"Humain",
        description : "Souvent considéré comme la race la plus faible. Sans aucun attribut spécifique."
    },
    {
        name :"Elfe",
        description : "Elfes brillants en magie, oreilles pointues; et réservés, fuient le contact, surtout avec les nains."
    },
    {
        name :"Nain",
        description : "Nains, petits mais puissants, vainquent des monstres sans Falna; experts de la terre, mines et bâti."
    },
    {
        name :"Pallum",
        description : "Pallums, petits demi-humains, réputés faibles, ont une vue fine, et voient dans l\'obscurité la nuit."
    },
    {
        name :"Chienthrope",
        description : "Humanoïde aux traits animaux, très répandu; variante : Homme-Chien, loyal, flair développé., fidèle."
    },
    {
        name :"Kitsune",
        description : "Humanoïde aux traits animaux, très répandu; variante : Homme-Renard, agile, rusé, sens affûtés. fin."
    },
    {
        name :"Boaz",
        description : "Humanoïde aux traits animaux, très répandu; variante : Homme-Sanglier, robuste, tenace, farouche."
    },
    {
        name :"Amazonienne",
        description : "Amazones, femmes demi-humaines à peau sombre; n'enfanter que filles, cherchent hommes forts."
    },
    {
        name :"Hume Bunny",
        description : "Humanoïde aux traits animaux, très répandu; variante : Homme-Lapin, vif, prudent, ouïe fine, rapide."
    },
    {
        name :"Weretiger",
        description : "Humanoïde aux traits animaux, très répandu; variante : Homme-Tigre, félin puissant, courageux. fier."
    },
    {
        name :"Werewolf",
        description : "Humanoïde aux traits animaux, très répandu; variante : Homme-Loup, meute, endurance, odorat."
    },
]


export function createCharacterModal(){
    // Création du modal pour collecter les informations
    const modal = new ModalBuilder()
        .setCustomId("creer_personnage_modal")
        .setTitle("Création de personnage");

    // Champ : Nom du personnage
    
    const nameInput = new TextInputBuilder()
        .setCustomId("nom")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const nameLabel = new LabelBuilder()
        .setLabel("Nom de ton personnage")
        .setTextInputComponent(nameInput);
    // Champ : Âge
    const ageInput = new TextInputBuilder()
        .setCustomId("age")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const ageLabel = new LabelBuilder()
        .setLabel("Âge de ton personnage (10-100)")
        .setTextInputComponent(ageInput);
    // Champ : Race (l'utilisateur saisit ici sa race)
    const raceInput = new StringSelectMenuBuilder()
        .setCustomId("race")
    
    races.forEach(race => {
        raceInput.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(race.name)
                .setDescription(race.description)
                .setValue(race.name)
                .setDefault(race.name == "Humain")
        )
    }); 
    const raceLabel = new LabelBuilder()
    .setLabel("Race :")
    .setStringSelectMenuComponent(raceInput);
    // Champ : Origine (optionnel)
    const originInput = new TextInputBuilder()
        .setCustomId("origine")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);
    const originLabel = new LabelBuilder()
        .setLabel("Origine (optionnel)")
        .setTextInputComponent(originInput);
    // Champ : Apparence (URL de l'image)
    const appearanceInput = new TextInputBuilder()
        .setCustomId("appearance")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
    const apparenceLabel = new LabelBuilder()
        .setLabel("URL de l'image de ton apparence (optionnel)")
        .setTextInputComponent(appearanceInput);
    // Ajout des champs au modal
    modal.addLabelComponents(nameLabel, ageLabel, raceLabel, originLabel, apparenceLabel)
    return modal;
}

export function createCharacterEmbed(character, status){
    const toFieldValue = (input, fallback = "-") => {
        const value = (input ?? "").toString().trim();
        return value.length > 0 ? value : fallback;
    };

    const embed = new EmbedBuilder()
    .setTitle(`Fiche de ${toFieldValue(character?.name, "Aventurier")}`)
    .setDescription(`Voici les caracteristiques de **${toFieldValue(character?.name, "Aventurier")}** :`)
    .addFields(
        { name: "🧓 Age", value: toFieldValue(character?.age, "?"), inline: true },
        { name: "👤 Race", value: toFieldValue(character?.race, "Inconnue"), inline: true },
        { name: "🌍 Origine", value: (() => { const originText = toFieldValue(character?.origin, "Inconnue"); return originText.length > 1024 ? `${originText.slice(0, 1021)}...` : originText; })(), inline: true },
        { name: "⭐ Niveau", value: toFieldValue(status?.level, "1"), inline: true },
        { name: "💪 Force", value: toFieldValue(status?.strength, "0"), inline: true },
        { name: "🍃 Agilite", value: toFieldValue(status?.agility, "0"), inline: true },
        { name: "🛡️ Endurance", value: toFieldValue(status?.endurance, "0"), inline: true },
        { name: "🧠 Intelligence", value: toFieldValue(status?.intelligence, "0"), inline: true },
        { name: "🎯 Dexterite", value: toFieldValue(status?.dexterity, "0"), inline: true },
        { name: "❤️ Sante", value: toFieldValue(character?.health, "0"), inline: true },
        { name: "⚡ Stamina", value: toFieldValue(character?.stamina, "0"), inline: true }
    )
    .setColor("#FFD700")
    .setFooter({ text: "Utilisez /rejoindre_familia pour rejoindre une Familia" })
    .setTimestamp();

    if (character?.appearance) {
        const thumbnailUrl = character.appearance.toString().trim();
        if (thumbnailUrl.length > 0) {
            embed.setThumbnail(thumbnailUrl);
        }
    }

    return embed;
}
function formatRemainingMs(ms) {
    const safe = Math.max(0, Number(ms) || 0);
    const totalSeconds = Math.ceil(safe / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}min ${seconds}s`;
}

export function buildDeathAnnouncementEmbed(character, { remainingMs } = {}) {
    const name = character?.name ?? "Un aventurier";
    const familia = character?.familia && character.familia !== "Aucune" ? character.familia : "Aucune";
    const remaining = formatRemainingMs(remainingMs);

    const embed = new EmbedBuilder()
        .setTitle(`Chute d'un aventurier: ${name}`)
        .setDescription(
            `La **Familia ${familia}** retient son souffle.\n` +
            `Dans les profondeurs, **${name}** vient de tomber au combat.`
        )
        .addFields(
            { name: "Etat", value: "Gravement blesse, incapable de reprendre l'assaut.", inline: false },
            { name: "Retour estime", value: `Peut se relever dans **${remaining}**.`, inline: false }
        )
        .setColor("#8b1a1a")
        .setFooter({ text: "Les dieux observent. Le destin n'est pas termine." })
        .setTimestamp();

    if (character?.appearance) {
        embed.setThumbnail(character.appearance);
    }

    return embed;
}

export function buildReviveAnnouncementEmbed(character) {
    const name = character?.name ?? "Un aventurier";
    const familia = character?.familia && character.familia !== "Aucune" ? character.familia : "Aucune";

    const embed = new EmbedBuilder()
        .setTitle(`Retour au front: ${name}`)
        .setDescription(
            `La **Familia ${familia}** retrouve l'un des siens.\n` +
            `**${name}** a recouvre ses forces et peut reprendre la route du donjon.`
        )
        .addFields(
            { name: "Etat", value: "Apte au combat.", inline: true },
            { name: "Conseil", value: "Reste prudent dans les prochains etages.", inline: true }
        )
        .setColor("#1f8b4c")
        .setFooter({ text: "Une nouvelle expedition peut commencer." })
        .setTimestamp();

    if (character?.appearance) {
        embed.setThumbnail(character.appearance);
    }

    return embed;
}

export async function printErrorNoCharacterFound(interaction){
    return await interaction.reply({ content: "❌ Un personnage est necéssaire pour utiliser cette commande. faite (/creer_personnage)", ephemeral: true });
}

export async function printErrorNoStatusFound(interaction){
    return await interaction.reply({ content: "❌ Le status du personnage n\'a pas été trouvé ou n\'existe pas.", ephemeral: true });
}

export async function printErrorNoPendingStatsFound(interaction){
    return await interaction.reply({ content: "❌ Le personnage ne possède pas de stats en attente, contacté un admin ceci n\'est pas normal.", ephemeral: true });
}

export async function printErrorCharacterCreation(interaction){
    return await interaction.reply({ content: "❌ Erreur lors de la création du personnage.", ephemeral: true });
}

export async function printErrorCannotHaveMultipleCharacter(interaction){
    return await interaction.reply({ content: "❌ Tu as déjà un personnage !", ephemeral: true });
}

export async function printErrorOldLessMinusThanTen(interaction){
    return await interaction.reply({ content: "❌ L'âge doit être compris entre 10 et 100.", ephemeral: true, });
}




export async function printEphemeralMessage(interaction, message) {
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: message });
    }
    return interaction.reply({ content: message, ephemeral: true });
}

export async function showEmbed(interaction, embed) {
    const payload = { embeds: [embed] };
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply(payload);
    }
    return interaction.reply(payload);
}




