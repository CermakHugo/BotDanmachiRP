import { buildExpeditionChatEmbed } from "./ExploreView.js";
import { handleGroupExpeditionMessage } from "./exploreService.js";
import { findOrHydrateSessionByExpeditionTextChannel, dissolveSession } from "../group/groupService.js";
import * as FightController from "../fight/fightController.js";
import * as CharacterRoute from "../character/CharacterRoute.js";

const HEAL_AFTER_MS = 3_600_000;

function formatRemainingMs(ms) {
  const safe = Math.max(0, Number(ms) || 0);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}min ${seconds}s`;
}

function getRemainingReviveMs(character) {
  const last = character?.lastDamageAt ? new Date(character.lastDamageAt).getTime() : null;
  if (!last) return HEAL_AFTER_MS;
  return (last + HEAL_AFTER_MS) - Date.now();
}

async function deleteChannelSafe(guild, channelId) {
  if (!guild || !channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  await channel.delete("Expedition terminee (sortie du donjon)").catch(() => {});
}

async function endExpeditionFromExit(message, session) {
  await deleteChannelSafe(message.guild, session.expeditionTextChannelId);
  await deleteChannelSafe(message.guild, session.expeditionVoiceChannelId);
  await dissolveSession(session.id);
}

export async function handleExpeditionTextMessage(message) {
  const session = await findOrHydrateSessionByExpeditionTextChannel(message.channel?.id);
  if (!session || !session.isFinalized) return false;
  if (message.author?.bot) return true;

  const isMember = session.members?.some(
    (m) => (m.status === "leader" || m.status === "accepted") && m.id === message.author.id
  );
  if (!isMember) return false;

  const character = await CharacterRoute.getCharacterForDiscordUser(message.author.id);
  if (!character) {
    await message.reply("Tu n'as pas de personnage. Utilise `/creer_personnage` avant de jouer.").catch(() => {});
    return true;
  }

  if (character.isDead) {
    const remaining = formatRemainingMs(getRemainingReviveMs(character));
    await message.reply(`Tu es KO. Tu pourras rejouer dans ${remaining}.`).catch(() => {});

    try {
      const memberIds = (session.members ?? [])
        .filter((m) => m.status === "leader" || m.status === "accepted")
        .map((m) => m.id);
      const chars = await Promise.all(memberIds.map((id) => CharacterRoute.getCharacterForDiscordUser(id).catch(() => null)));
      const allDead = chars.length > 0 && chars.every((c) => c && c.isDead);
      if (allDead) {
        await endExpeditionFromExit(message, session);
      }
    } catch {}

    return true;
  }

  try {
    const outcome = await handleGroupExpeditionMessage(message, session);

    if (outcome.type === "ignored" || outcome.type === "ignored_fight" || outcome.type === "ignored_duplicate" || outcome.type === "waiting" || outcome.type === "dead") {
      if (outcome.type === "waiting") {
        const waitingMentions = Array.isArray(outcome.waitingFor)
          ? outcome.waitingFor.map((id) => `<@${id}>`).join(", ")
          : "";
        await message.reply(`Action enregistree. En attente de: ${waitingMentions || "autres membres du groupe"}.`).catch(() => {});
      }
      return true;
    }

    if (outcome.type === "error") {
      await message.reply(outcome.message || "Impossible de traiter l'action.").catch(() => {});
      return true;
    }

    const embed = buildExpeditionChatEmbed(outcome);
    if (outcome.processingMessage?.editable) {
      await outcome.processingMessage.edit({ content: "", embeds: [embed] }).catch(async () => {
        await message.reply({ embeds: [embed] }).catch(() => {});
      });
    } else {
      await message.reply({ embeds: [embed] });
    }

    if (outcome.type === "exit") {
      await endExpeditionFromExit(message, session);
    }

    if (outcome.type === "fight") {
      await FightController.encouterEnnemies(message, session, outcome.floor);
    }

    return true;
  } catch (error) {
    console.error("[exploreController] handleExpeditionTextMessage", error);
    await message.reply(error.message || "Impossible de repondre pour le moment.").catch(() => {});
    return true;
  }
}

export default { handleExpeditionTextMessage };
