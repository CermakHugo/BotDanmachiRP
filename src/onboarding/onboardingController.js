import { MessageFlags, ChannelType } from "discord.js";
import * as onboardingService from "./onboardingService.js";
import * as onboardingView from "./onboardingView.js";
import * as onboardingRoute from "./onboardingRoute.js";

function reply(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

function normalizeText(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function resolveHrpGeneralChannel(interaction) {
  const guild = interaction.guild;
  if (!guild) return null;

  const setupId = await onboardingRoute.getServerChannelId(guild.id, "channel:hrp:general");
  if (setupId) {
    const fromSetup = await guild.channels.fetch(setupId).catch(() => null);
    if (fromSetup?.isTextBased()) return fromSetup;
  }

  const channels = guild.channels?.cache;
  if (!channels) return null;

  const hrpCategory = Array.from(channels.values()).find(
    (channel) => channel.type === ChannelType.GuildCategory && normalizeText(channel.name).includes("hrp")
  );

  if (hrpCategory) {
    const generalInHrp = Array.from(channels.values()).find(
      (channel) =>
        channel.parentId === hrpCategory.id &&
        channel.type === ChannelType.GuildText &&
        normalizeText(channel.name).includes("general")
    );
    if (generalInHrp) return generalInHrp;
  }

  const fallbackGeneral = Array.from(channels.values()).find(
    (channel) => channel.type === ChannelType.GuildText && normalizeText(channel.name).includes("general")
  );

  return fallbackGeneral || null;
}

async function maybeAnnounceOnboardingCompletion(interaction, onboarding) {
  if ((onboarding?.completionPercent || 0) < 100) return;

  const isFirstCompletion = await onboardingRoute.claimOnboardingCompletion(interaction.user.id).catch(() => false);
  if (!isFirstCompletion) return;

  const channel = await resolveHrpGeneralChannel(interaction);
  if (!channel) return;

  await channel.send(`?? ${interaction.user} est desormais pret(e) pour l'aventure.`).catch(() => {});
}

async function buildMessage(interaction) {
  const onboarding = await onboardingService.getOnboardingState(interaction.user.id, interaction.guildId || null);
  const message = onboardingView.buildOnboardingEmbed(onboarding);
  await maybeAnnounceOnboardingCompletion(interaction, onboarding);
  return message;
}

export async function showOnboarding(interaction) {
  const message = await buildMessage(interaction);
  return reply(interaction, {
    ...message,
    flags: MessageFlags.Ephemeral,
  });
}

export async function pushOnboardingUpdate(interaction) {
  const message = await buildMessage(interaction);

  if (interaction.deferred || interaction.replied) {
    return interaction.followUp({
      ...message,
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    ...message,
    flags: MessageFlags.Ephemeral,
  });
}

export default {
  showOnboarding,
  pushOnboardingUpdate,
};