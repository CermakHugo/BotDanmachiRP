import { ChannelType } from "discord.js";

function normalizeName(name) {
  return (name || "").toString().trim().toLowerCase();
}

export async function fetchGuildChannels(guild) {
  if (!guild) return null;
  try {
    return await guild.channels.fetch();
  } catch {
    return null;
  }
}

export function findCategoryByName(guild, name) {
  const target = normalizeName(name);
  if (!target) return null;
  return guild.channels.cache.find(
    (c) => c?.type === ChannelType.GuildCategory && normalizeName(c.name) === target
  );
}

export async function ensureCategory(guild, name) {
  const existing = findCategoryByName(guild, name);
  if (existing) return { category: existing, created: false };

  const created = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    reason: "Server setup automation",
  });
  return { category: created, created: true };
}

function findChannelInCategoryByName(guild, parentId, name) {
  const target = normalizeName(name);
  if (!target) return null;
  return guild.channels.cache.find(
    (c) =>
      c?.parentId === parentId &&
      normalizeName(c.name) === target &&
      (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice)
  );
}

export async function ensureTextChannel(guild, parentId, name) {
  const existing = findChannelInCategoryByName(guild, parentId, name);
  if (existing) return { channel: existing, created: false };

  const created = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: parentId,
    reason: "Server setup automation",
  });
  return { channel: created, created: true };
}

export async function ensureVoiceChannel(guild, parentId, name) {
  const existing = findChannelInCategoryByName(guild, parentId, name);
  if (existing) return { channel: existing, created: false };

  const created = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: parentId,
    reason: "Server setup automation",
  });
  return { channel: created, created: true };
}

export default {
  fetchGuildChannels,
  ensureCategory,
  ensureTextChannel,
  ensureVoiceChannel,
};

