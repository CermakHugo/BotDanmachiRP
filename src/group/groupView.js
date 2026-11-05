import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";


function translateVisibility(value) {
  switch (value) {
    case "familia":
      return "Reserve a ta familia";
    case "closed":
      return "Recrutement ferme";
    default:
      return "Ouvert a tous";
  }
}

function mentionList(users) {
  return users.length ? users.map((member) => `<@${member.id}>`).join("\n") : "Aucun";
}

function formatMembers(session) {
  return {
    leader: mentionList(session.members.filter((m) => m.status === "leader")) || "Chef non defini",
    accepted: mentionList(session.members.filter((m) => m.status === "accepted")) || "Aucun membre confirme.",
    pending: mentionList(session.members.filter((m) => m.status === "pending")) || "Aucun candidat en attente.",
  };
}

function buildRecruitmentEmbed(session) {

  const members = formatMembers(session);
  return new EmbedBuilder()
    .setTitle(`Annonce : ${session.name}`)
    .setDescription(session.description)
    .addFields(
      { name: "Leader", value: members.leader, inline: false },
      { name: "Membres confirmes", value: members.accepted, inline: false },
      { name: "Candidats", value: members.pending, inline: false },
      { name: "Visibilite", value: translateVisibility(session.visibility), inline: true },
      { name: "Statut", value: "Recrutement ouvert", inline: true }
    );
}

function buildFinalizedEmbed(session) {

  const members = formatMembers(session);
  return new EmbedBuilder()
    .setTitle(`Expedition : ${session.name}`)
    .setDescription(session.description || "Aucune description.")
    .addFields(
      { name: "Chef", value: members.leader, inline: false },
      { name: "Membres actifs", value: members.accepted, inline: false },
      { name: "Anciens candidats", value: members.pending, inline: false },
      { name: "Visibilite", value: translateVisibility(session.visibility), inline: true },
      { name: "Statut", value: "Expedition en cours", inline: true }
    );
}

function buildPublicRows(session) {

  const rows = [];

  const mainRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`group_join:session=${session.id}`)
      .setLabel(session.isFinalized ? "Reintegrer" : "Rejoindre")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`group_leave:session=${session.id}`)
      .setLabel("Quitter")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`group_invite:session=${session.id}`)
      .setLabel("Inviter")
      .setStyle(ButtonStyle.Secondary),
  );
  rows.push(mainRow);

  const managementRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`group_exclude:session=${session.id}`)
      .setLabel("Exclure")
      .setStyle(ButtonStyle.Secondary),
  );

  if (!session.isFinalized) {
    managementRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`group_validate:session=${session.id}`)
        .setLabel("Valider")
        .setStyle(ButtonStyle.Success),
    );
  }

  rows.push(managementRow);
  return rows;
}

export function recruitmentEmbed(session) {

  if (session.isFinalized) {
    return {
      content: `Expedition en cours : **${session.name}**`,
      embeds: [],
      components: buildPublicRows(session),
    };
  }

  const embed = buildRecruitmentEmbed(session);
  return { embeds: [embed], components: buildPublicRows(session) };
}

export function buildCreateGroupModal() {

  const modal = new ModalBuilder()
    .setCustomId("create_group")
    .setTitle("Nouvelle annonce de groupe");

  const nameInput = new TextInputBuilder()
    .setCustomId("group_name")
    .setLabel("Nom du groupe")
    .setPlaceholder("Ex: Les Braves")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const descInput = new TextInputBuilder()
    .setCustomId("group_description")
    .setLabel("Description")
    .setPlaceholder("Precise vos attentes...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(descInput)
  );

  return modal;
}

export function parseCreateGroupModal(interaction) {
  const name = interaction.fields.getTextInputValue("group_name");
  const description = interaction.fields.getTextInputValue("group_description") || "";
  const visibility = "open";
  return { name, description, visibility };
}

export function buildInviteModal(session) {
  const modal = new ModalBuilder()
    .setCustomId(`group_invite_modal:session=${session.id}`)
    .setTitle("Inviter un joueur");

  const userInput = new TextInputBuilder()
    .setCustomId("invite_target")
    .setLabel("Utilisateur (@mention ou ID)")
    .setPlaceholder("Ex: @Hugo ou 123456789012345678")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(userInput));
  return modal;
}

export function buildExcludeModal(session) {
  const modal = new ModalBuilder()
    .setCustomId(`group_exclude_modal:session=${session.id}`)
    .setTitle("Exclure un joueur");

  const userInput = new TextInputBuilder()
    .setCustomId("exclude_target")
    .setLabel("Utilisateur (@mention ou ID)")
    .setPlaceholder("Ex: @Tatsu ou 123456789012345678")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(userInput));
  return modal;
}
