import * as groupService from "./groupService.js";
import * as groupView from "./groupView.js";
import { getServerCategoryId } from "../serverSetup/serverSetupService.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionsBitField,
} from "discord.js";

// Controleur principal du module groupe (pont entre service et vue).
const EXPEDITION_CATEGORY_ID_FALLBACK = "1199448289121140748";

function buildPublicView(session) {
  return groupView.recruitmentEmbed(session);
}

function buildPrivateReply(interaction, content) {
  return interaction.guildId ? { content, flags: MessageFlags.Ephemeral } : { content };
}

function safeReply(interaction, content) {
  const payload = buildPrivateReply(interaction, content);
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

function isPublicInteraction(interaction, session) {
  return interaction.channelId && session.channelId && interaction.channelId === session.channelId;
}

// Garantit que l'on met a jour le bon message (public vs interaction ephemere).
async function sendComponentUpdate(interaction, session, view, feedback = "Affichage mis a jour.") {
  if (isPublicInteraction(interaction, session)) {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(view);
    }
    if (typeof interaction.isButton === "function" && interaction.isButton()) {
      return interaction.update(view);
    }
    if (typeof interaction.isStringSelectMenu === "function" && interaction.isStringSelectMenu()) {
      return interaction.update(view);
    }
    return interaction.reply(view);
  }

  await editSessionMessage(interaction, session, view);
  const payload = buildPrivateReply(interaction, feedback);
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

// Edition du message ancre dans le salon public.
async function editSessionMessage(interaction, session, view) {
  if (!session.channelId || !session.leaderMessageId) return;
  try {
    const channel = await interaction.client.channels.fetch(session.channelId);
    if (!channel?.isTextBased()) return;
    const message = await channel.messages.fetch(session.leaderMessageId);
    await message.edit(view);
  } catch (error) {
    console.error("[groupController] Impossible de mettre a jour le message du groupe", error);
  }
}

function extractSessionId(customId) {
  const match = customId.match(/session=([A-Za-z0-9-]+)/);
  return match ? match[1] : null;
}

function slugifyName(name) {
  const base = (name || "groupe")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return base || "aventuriers";
}

async function getGuild(interaction, session) {
  if (interaction.guild) return interaction.guild;
  if (session.guildId) {
    try {
      return await interaction.client.guilds.fetch(session.guildId);
    } catch (error) {
      console.error("[groupController] Impossible de recuperer la guilde", error);
    }
  }
  return null;
}

// Liste des membres ayant acces aux salons prives.
function getAuthorizedMemberIds(session) {
  return session.members
    .filter((member) => member.status === "leader" || member.status === "accepted")
    .map((member) => member.id);
}

// Permissions detaillees pour le salon textuel.
function buildTextPermissions(guild, memberIds) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
  ];

  for (const id of memberIds) {
    overwrites.push({
      id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    });
  }

  return overwrites;
}

// Permissions detaillees pour le salon vocal.
function buildVoicePermissions(guild, memberIds) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
    },
  ];

  for (const id of memberIds) {
    overwrites.push({
      id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
      ],
    });
  }

  return overwrites;
}

// Recalcule les droits des salons quand la composition change.
async function syncExpeditionPermissions(client, session) {
  if (!session.expeditionTextChannelId && !session.expeditionVoiceChannelId) return;
  try {
    const channel = await client.channels.fetch(session.expeditionTextChannelId ?? session.expeditionVoiceChannelId);
    if (!channel || !('guild' in channel) || !channel.guild) return;
    const guild = channel.guild;
    const authorized = getAuthorizedMemberIds(session);

    if (session.expeditionTextChannelId) {
      const textChannel = await client.channels.fetch(session.expeditionTextChannelId).catch(() => null);
      if (textChannel) {
        await textChannel.permissionOverwrites.set(buildTextPermissions(guild, authorized));
      }
    }

    if (session.expeditionVoiceChannelId) {
      const voiceChannel = await client.channels.fetch(session.expeditionVoiceChannelId).catch(() => null);
      if (voiceChannel) {
        await voiceChannel.permissionOverwrites.set(buildVoicePermissions(guild, authorized));
      }
    }
  } catch (error) {
    console.error("[groupController] syncExpeditionPermissions", error);
  }
}

// Creation automatique des salons prives (textuel + vocal).
async function createExpeditionChannels(interaction, session) {
  if (session.expeditionTextChannelId && session.expeditionVoiceChannelId) return;
  let guild = interaction.guild;
  if (!guild && session.guildId) {
    guild = await interaction.client.guilds.fetch(session.guildId).catch(() => null);
  }
  if (!guild) return;

  try {
    const categoryId = (await getServerCategoryId(guild.id, "dungeon").catch(() => null)) || EXPEDITION_CATEGORY_ID_FALLBACK;
    const nameSlug = slugifyName(session.name);
    const memberIds = getAuthorizedMemberIds(session);
    const textChannel = await guild.channels.create({
      name: `expedition-${nameSlug}`.slice(0, 90),
      type: ChannelType.GuildText,
      parent: categoryId,
      reason: `Expedition pour ${session.name}`,
      permissionOverwrites: buildTextPermissions(guild, memberIds),
    });

    const voiceChannel = await guild.channels.create({
      name: `Expedition ${session.name}`.slice(0, 90),
      type: ChannelType.GuildVoice,
      parent: categoryId,
      reason: `Expedition pour ${session.name}`,
      permissionOverwrites: buildVoicePermissions(guild, memberIds),
    });

    session.expeditionTextChannelId = textChannel?.id ?? null;
    session.expeditionVoiceChannelId = voiceChannel?.id ?? null;
    await groupService.setExpeditionChannels(session.id, {
      textChannelId: session.expeditionTextChannelId,
      voiceChannelId: session.expeditionVoiceChannelId,
    });
  } catch (error) {
    console.error("[groupController] Impossible de creer les salons d'expedition", error);
  }
}

// Nettoyage des salons en fin d'expedition.
async function deleteExpeditionChannels(interaction, session) {
  const deleteChannel = async (channelId) => {
    if (!channelId) return;
    try {
      const channel = await interaction.client.channels.fetch(channelId);
      if (channel) await channel.delete("Fin d'expedition");
    } catch (error) {
      console.error("[groupController] Suppression de salon impossible", error);
    }
  };

  await deleteChannel(session.expeditionTextChannelId);
  await deleteChannel(session.expeditionVoiceChannelId);
  session.expeditionTextChannelId = null;
  session.expeditionVoiceChannelId = null;
}

// Notifications legeres dans le salon public, ciblees sur le joueur.
async function notifyInvitee(interaction, session, member) {
  if (!session.channelId) return false;
  const channel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const content = `Salut <@${member.id}> ! ${interaction.user} t'invite a rejoindre **${session.name}**.\n`
    + "Utilise le bouton *Rejoindre* du message principal pour accepter ou ignore ce message pour refuser.";
  await channel.send({ content, allowedMentions: { users: [member.id] } }).catch(() => {});
  return true;
}

async function notifyExclusion(interaction, session, memberId) {
  if (!session.channelId) return;
  const channel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const content = `<@${memberId}>, tu as ete retire du groupe **${session.name}**. `;
  await channel.send({
    content: `${content}Tu peux contacter le leader si besoin.`,
    allowedMentions: { users: [memberId] },
  }).catch(() => {});
}

// Construit la liste deroulante (max 25) a partir des membres disponibles.
async function buildInviteOptions(interaction, session) {
  const guild = await getGuild(interaction, session);
  if (!guild) {
    throw new Error("Impossible de recuperer la guilde.");
  }

  // Tentative rapide de rafraichir la cache (limite reduite pour eviter les timeouts).
  await guild.members
    .fetch({ query: "", limit: 100 })
    .catch((error) =>
      console.warn(
        "[groupController] Impossible de rafraichir la liste des membres (limite 100). Utilisation du cache existant.",
        error?.message
      )
    );

  const takenIds = new Set(session.members.map((m) => m.id));
  const options = [];
  for (const member of guild.members.cache.values()) {
    if (member.user.bot || takenIds.has(member.id)) continue;
    const label = (member.displayName || member.user.username || "Membre").slice(0, 25);
    const description = member.nickname
      ? `Pseudo: ${member.nickname}`.slice(0, 50)
      : `ID: ${member.id}`.slice(0, 50);
    options.push({ label, value: member.id, description });
    if (options.length === 25) break;
  }
  return options;
}

// Lance une nouvelle annonce publique et lie le message initial.
export async function startRecruitment(interaction, payload = {}) {
  let session = null;
  try {
    session = await groupService.createRecruitmentSession({
      guildId: interaction.guildId,
      leaderId: interaction.user.id,
      name: payload.name,
      description: payload.description,
      visibility: payload.visibility,
    });

    const view = buildPublicView(session);
    await interaction.reply(view);
    const message = await interaction.fetchReply();
    const embedPayload = view.embeds?.[0]?.data ?? view.embeds?.[0]?.toJSON?.() ?? null;
    groupService.attachMessageToSession(session.id, message, embedPayload);
    await interaction.followUp({
      content: "Annonce publiee. Gere tout depuis les boutons de ce message.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    if (session?.id) {
      groupService.discardSession(session.id);
    }
    await safeReply(interaction, error.message || "Impossible de lancer l'annonce.");
  }
}

export async function showCreateGroupModal(interaction) {
  const modal = groupView.buildCreateGroupModal();
  await interaction.showModal(modal);
}

export async function handleCreateGroupModal(interaction) {
  const { name, description, visibility } = groupView.parseCreateGroupModal(interaction);
  await startRecruitment(interaction, { name, description, visibility });
}

// Gestion du clic "Rejoindre" / "Reintegrer".
export async function apply(interaction, sessionId) {
  try {
    const result = await groupService.addCandidate(sessionId, interaction.user.id);
    const view = buildPublicView(result.session);
    await sendComponentUpdate(interaction, result.session, view);
    if (result.status === "accepted") {
      await syncExpeditionPermissions(interaction.client, result.session);
    }
  } catch (error) {
    await safeReply(interaction, error.message);
  }
}

// Validation finale: creation des salons et bascule embed.
export async function validate(interaction, sessionId) {
  try {
    await interaction.deferReply({flags: MessageFlags.Ephemeral});
    const { session } = await groupService.validateSession(sessionId, interaction.user.id);
    await createExpeditionChannels(interaction, session);
    await syncExpeditionPermissions(interaction.client, session);

    // Une fois valide, on supprime l'annonce publique (plus de message/boutons).
    try {
      if (interaction.message?.deletable) {
        await interaction.message.delete();
      } else if (session.channelId && session.leaderMessageId) {
        const channel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
        if (channel?.isTextBased?.()) {
          const msg = await channel.messages.fetch(session.leaderMessageId).catch(() => null);
          if (msg?.deletable) await msg.delete();
        }
      }
    } catch (error) {
      console.warn("[groupController] Impossible de supprimer le message d'annonce", error?.message || error);
    }

    // On oublie les infos du message pour eviter tout futur edit.
    session.channelId = null;
    session.leaderMessageId = null;

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({ content: "Groupe valide, expedition lancee.", flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content: "Groupe valide, expedition lancee.", flags: MessageFlags.Ephemeral });
  } catch (error) {
    await safeReply(interaction, error.message);
  }
}

// Liste deroulante pour exclure les membres actuels.
async function buildExcludeOptions(interaction, session) {
  const guild = await getGuild(interaction, session);
  if (!guild) throw new Error("Impossible de recuperer la guilde.");

  const options = [];
  for (const member of session.members) {
    if (member.status === "leader") continue;
    let discordMember = guild.members.cache.get(member.id);
    if (!discordMember) {
      discordMember = await guild.members.fetch({ user: member.id }).catch(() => null);
    }
    const labelSource = discordMember ? discordMember.displayName || discordMember.user.username : member.id;
    const label = labelSource.slice(0, 25);
    const description = member.status === "pending" ? "Candidat en attente" : "Membre confirme";
    options.push({ label, value: member.id, description });
  }
  return options;
}

export async function showExcludeModal(interaction, sessionId) {
  const session = groupService.findSessionById(sessionId);
  if (!session) {
    return safeReply(interaction, "Ce groupe est introuvable.");
  }
  if (session.leaderId !== interaction.user.id) {
    return safeReply(interaction, "Seul le leader peut exclure un joueur.");
  }

  try {
    const modal = groupView.buildExcludeModal(session);
    return interaction.showModal(modal);
  } catch (error) {
    return safeReply(interaction, error.message || "Impossible d'afficher la liste des membres.");
  }
}

// Liste deroulante pour inviter rapidement.
export async function showInviteModal(interaction, sessionId) {
  const session = groupService.findSessionById(sessionId);
  if (!session) {
    return safeReply(interaction, "Ce groupe est introuvable.");
  }
  if (session.leaderId !== interaction.user.id) {
    return safeReply(interaction, "Seul le leader peut inviter un joueur.");
  }

  try {
    const modal = groupView.buildInviteModal(session);
    return interaction.showModal(modal);
  } catch (error) {
    return safeReply(interaction, error.message || "Impossible d'afficher la liste des joueurs.");
  }
}

function parseUserId(raw) {
  const value = (raw || "").trim();
  const mentionMatch = value.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  const idMatch = value.match(/^(\d{15,25})$/);
  if (idMatch) return idMatch[1];
  return null;
}

function getModalSelectValue(interaction, customId) {
  if (interaction.fields && typeof interaction.fields.getTextInputValue === "function") {
    try {
      const value = interaction.fields.getTextInputValue(customId);
      if (typeof value === "string" && value.trim()) return value.trim();
    } catch {}
  }

  if (interaction.fields && typeof interaction.fields.getStringSelectValues === "function") {
    const values = interaction.fields.getStringSelectValues(customId);
    if (Array.isArray(values) && values.length) return values[0];
  }

  if (interaction.fields && typeof interaction.fields.getField === "function") {
    const field = interaction.fields.getField(customId);
    if (field?.values?.length) return field.values[0];
  }

  const altField = interaction.fields?.fields?.get?.(customId);
  if (altField?.values?.length) return altField.values[0];
  return null;
}

export async function handleExcludeModal(interaction) {
  try {
    const sessionId = extractSessionId(interaction.customId);
    if (!sessionId) throw new Error("Annonce invalide.");
    const session = groupService.findSessionById(sessionId);
    if (!session) throw new Error("Ce groupe est introuvable.");
    if (session.leaderId !== interaction.user.id) throw new Error("Seul le leader peut exclure un joueur.");

    const rawTarget = getModalSelectValue(interaction, "exclude_target");
    const targetId = parseUserId(rawTarget);
    if (!targetId) throw new Error("Selection invalide. Utilise une mention ou un ID.");

    const exists = session.members.some((member) => member.id === targetId);
    if (!exists) throw new Error("Ce joueur n'est pas dans ton groupe.");
    if (targetId === session.leaderId) throw new Error("Impossible d'exclure le leader.");

    const result = await groupService.excludeMember(sessionId, interaction.user.id, targetId);
    await refreshPublicMessage(interaction, result.session);
    await syncExpeditionPermissions(interaction.client, result.session);
    await notifyExclusion(interaction, result.session, targetId);
    await interaction.reply({ content: "Joueur exclu.", flags: MessageFlags.Ephemeral });
  } catch (error) {
    await safeReply(interaction, error.message || "Impossible d'exclure ce joueur.");
  }
}

export async function handleInviteModal(interaction) {
  try {
    const sessionId = extractSessionId(interaction.customId);
    if (!sessionId) throw new Error("Annonce invalide.");
    const session = groupService.findSessionById(sessionId);
    if (!session) throw new Error("Ce groupe est introuvable.");
    if (session.leaderId !== interaction.user.id) throw new Error("Seul le leader peut inviter un joueur.");

    const rawTarget = getModalSelectValue(interaction, "invite_target");
    const targetId = parseUserId(rawTarget);
    if (!targetId) throw new Error("Selection invalide. Utilise une mention ou un ID.");

    const guild = await getGuild(interaction, session);
    if (!guild) throw new Error("Impossible de recuperer la guilde.");
    const member = await guild.members.fetch(targetId).catch(() => null);
    if (!member) throw new Error("Ce joueur est introuvable.");

    const result = await groupService.inviteMember(sessionId, interaction.user.id, member.id);
    await refreshPublicMessage(interaction, result.session);
    const delivered = await notifyInvitee(interaction, result.session, member);
    const invitedName = member.displayName || member.user.username;
    const notice = delivered
      ? `${invitedName} a ete invite via un ping prive.`
      : `${invitedName} a ete invite, mais le ping prive a echoue (verifie ses MPs/permissions).`;
    await interaction.reply({ content: notice, flags: MessageFlags.Ephemeral });
  } catch (error) {
    await safeReply(interaction, error.message || "Impossible d'inviter ce joueur.");
  }
}

// Procedure de fin d'expedition (salons + BDD).
async function closeSession(interaction, session) {
  await deleteExpeditionChannels(interaction, session);
  const finalView = { content: "Expedition terminee, le groupe est dissout.", embeds: [], components: [] };
  await editSessionMessage(interaction, session, finalView);
  await groupService.dissolveSession(session.id);
  if (typeof interaction.isButton === "function" && interaction.isButton()) {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(finalView);
    } else {
      await interaction.update(finalView);
    }
  } else {
    await safeReply(interaction, finalView.content);
  }
}

// Confirmation avant de quitter/dissoudre.
export async function requestLeave(interaction, sessionId) {
  const session = groupService.findSessionById(sessionId);
  if (!session) {
    return safeReply(interaction, "Ce groupe est introuvable.");
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`group_leave_confirm:session=${sessionId}`)
      .setLabel(session.leaderId === interaction.user.id ? "Oui, dissoudre" : "Oui, quitter")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`group_leave_cancel:session=${sessionId}`)
      .setLabel("Annuler")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: "Etes-vous sur de vouloir quitter le groupe ?",
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// Action reelle apres confirmation (joueur ou leader).
export async function confirmLeave(interaction, sessionId) {
  const session = groupService.findSessionById(sessionId);
  if (!session) {
    return safeReply(interaction, "Ce groupe a deja ete dissout.");
  }

  if (session.leaderId === interaction.user.id) {
    await closeSession(interaction, session);
    return;
  }

  try {
    const result = await groupService.leaveSession(sessionId, interaction.user.id);
    await refreshPublicMessage(interaction, result.session);
    if (result.session.isFinalized) {
      await syncExpeditionPermissions(interaction.client, result.session);
    }
    await safeReply(interaction, "Tu as quitte le groupe.");
  } catch (error) {
    await safeReply(interaction, error.message || "Impossible de quitter le groupe.");
  }
}

// Re-applique la vue publique sur le message original.
async function refreshPublicMessage(interaction, session) {
  const view = buildPublicView(session);
  await editSessionMessage(interaction, session, view);
}

// Bouton "Annuler" lors de la confirmation.
export async function cancelLeave(interaction) {
  await safeReply(interaction, "Action annulee.");
}

// Bouton "Fin expedition" (leader uniquement).
export async function endExpedition(interaction, sessionId) {
  try {
    const session = groupService.findSessionById(sessionId);
    if (!session) throw new Error("Ce groupe a deja ete dissout.");
    if (session.leaderId !== interaction.user.id) throw new Error("Seul le leader peut terminer l'expedition.");
    if (!session.isFinalized) throw new Error("Valide ton groupe avant de terminer l'expedition.");
    await closeSession(interaction, session);
  } catch (error) {
    await safeReply(interaction, error.message);
  }
}

// Variante slash /endexpedition pour depanner le leader.
export async function endExpeditionFromCommand(interaction) {
  try {
    const session = groupService.findFinalizedSessionByLeader(interaction.user.id);
    if (!session) throw new Error("Tu n'as aucune expedition en cours.");
    await closeSession(interaction, session);
  } catch (error) {
    await safeReply(interaction, error.message);
  }
}

// Select menu legacy / futur usage (evite un import cassant cote interactions).
export async function handleVisibilitySelection(interaction, sessionId) {
  try {
    const session = groupService.findSessionById(sessionId);
    if (!session) {
      return safeReply(interaction, "Ce groupe est introuvable.");
    }
    if (session.leaderId !== interaction.user.id) {
      return safeReply(interaction, "Seul le leader peut changer la visibilite.");
    }

    const nextVisibility = Array.isArray(interaction.values) ? interaction.values[0] : null;
    if (!nextVisibility) {
      return safeReply(interaction, "Visibilite invalide.");
    }

    const updated = await groupService.setSessionVisibility(sessionId, interaction.user.id, nextVisibility);
    const view = buildPublicView(updated);
    return sendComponentUpdate(interaction, updated, view, "Visibilite mise a jour.");
  } catch (error) {
    return safeReply(interaction, error.message || "Impossible de changer la visibilite.");
  }
}


