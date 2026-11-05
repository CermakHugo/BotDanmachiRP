import { MessageFlags } from "discord.js";
import * as familiaService from "./familiaService.js";
import * as familiaView from "./familiaView.js";
import { getFamiliaChannelId } from "../serverSetup/serverSetupService.js";
import * as onboardingController from "../onboarding/onboardingController.js";

function reply(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

export async function registerMember({ familiaName, roleId, channelId, guild, client }) {
  const familia = await familiaService.ensureFamiliaRecord({ name: familiaName, roleId, announcementChannelId: channelId });
  await familiaService.ensureCaptainRoleForFamilia(familia, { guild, client });
  await familiaService.maybeTriggerElection(familiaName, {
    reason: "Nouvelle nomination",
    client,
  });
}

export async function castVote(interaction, candidateId) {
  try {
    const voter = await familiaService.getCharacterByUserId(interaction.user.id);
    if (!voter || !voter.familia || voter.familia === "Aucune") {
      return reply(interaction, {
        content: "Tu n'appartiens a aucune familia.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const result = await familiaService.castVote(voter.familia, interaction.user.id, candidateId);
    await reply(interaction, {
      content: result.updated ? "Vote mis a jour." : "Vote pris en compte.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    await reply(interaction, {
      content: error.message || "Impossible d'enregistrer ton vote.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function showFamilia(interaction, familiaName) {
  try {
    const name = familiaName || (await familiaService.getUserFamilia(interaction.user.id));
    if (!name) {
      return reply(interaction, {
        content: "Precise une familia ou rejoins-en une pour consulter les informations.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const familia = await familiaService.getFamiliaByName(name, {
      guild: interaction.guild,
      client: interaction.client,
    });
    if (!familia) {
      return reply(interaction, {
        content: "Cette familia est inconnue.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const [memberCount, election] = await Promise.all([
      familiaService.countMembers(familia.name),
      familiaService.getActiveElection(familia.id),
    ]);
    const captain = await familiaService.getCaptainCharacter(familia);
    const view = familiaView.buildFamiliaInfo({ familia, memberCount, captain, election });
    await reply(interaction, { ...view, flags: MessageFlags.Ephemeral });
  } catch (error) {
    await reply(interaction, {
      content: error.message || "Impossible d'afficher la familia.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function joinFamilia(interaction, chosenGod) {
  try {
    const userId = interaction.user.id;
    const guild = interaction.guild || (interaction.guildId ? await interaction.client.guilds.fetch(interaction.guildId).catch(() => null) : null);
    if (!guild) {
      return reply(interaction, {
        content: "Cette commande doit etre utilisee dans une guilde ou le bot est present.",
      });
    }

    const member = interaction.member || await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return reply(interaction, {
        content: "Impossible de recuperer ton profil dans cette guilde. Reessaie plus tard.",
      });
    }

    const character = await familiaService.getCharacterByUserId(userId);
    if (!character) {
      return reply(interaction, {
        content: "Tu dois d'abord creer un personnage avec `/creer_personnage`."
      });
    }
    if (character.familia !== "Aucune") {
      return reply(interaction, {
        content: `Tu fais deja partie de la familia **${character.familia}**.`
      });
    }

    const joinDecision = await familiaService.evaluateJoinFamiliaRequest({
      userId,
      chosenGod,
      characterName: character.name,
    });

    if (!joinDecision.accepted) {
      return reply(interaction, familiaView.buildJoinRefusedReply({
        chosenGod,
        aiResponse: joinDecision.aiResponse,
      }));
    }

    const familiaName = chosenGod.charAt(0).toUpperCase() + chosenGod.slice(1);
    const resolvedRole = await familiaService.resolveFamiliaRole(guild.id, guild, chosenGod);
    if (!resolvedRole) {
      return reply(interaction, {
        content: "Cette familia est introuvable (role manquant ou absent).",
      });
    }

    try {
      await member.roles.add(resolvedRole.role);
    } catch (error) {
      console.error("Erreur lors de l'attribution du role :", error);
      return reply(interaction, {
        content: "Impossible d'attribuer le role de cette familia.",
      });
    }

    character.familia = familiaName;
    await character.save();

    const posted = await familiaService.sendJoinWelcomeAndWeaponPicker({
      guild,
      chosenGod,
      familiaName,
      userMention: `${interaction.user}`,
      characterName: character.name,
      userId,
    });

    const annonceChannelId =
      (await getFamiliaChannelId(guild.id, chosenGod, "annonce").catch(() => null)) ||
      posted.discussionChannelId ||
      null;

    await registerMember({
      familiaName: character.familia,
      roleId: resolvedRole.roleId,
      channelId: annonceChannelId,
      guild,
      client: interaction.client,
    });

    if (!posted.postedInFamiliaChannel) {
      await reply(interaction, {
        content:
          `**${character.name}**, tu as ete accepte(e) par **${chosenGod}** !\n\n*${joinDecision.aiResponse}*\n\n` +
          "Le salon de familia est introuvable pour afficher le message de bienvenue.",
      });
      await onboardingController.pushOnboardingUpdate(interaction).catch(() => {});
      return;
    }

    await reply(interaction, familiaView.buildJoinAcceptedReply({
      characterName: character.name,
      chosenGod,
      aiResponse: joinDecision.aiResponse,
    }));
    await onboardingController.pushOnboardingUpdate(interaction).catch(() => {});
    return;
  } catch (error) {
    console.error("Erreur lors de rejoindre_familia :", error);
    return reply(interaction, {
      content: "Une erreur est survenue. Ressaye plus tard."
    });
  }
}