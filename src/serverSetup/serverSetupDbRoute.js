import { Op } from "sequelize";
import { ServerChannel, ServerRole } from "./serverSetupModel.js";

function normalizeKey(value) {
  return (value || "").toString().trim();
}

export async function upsertServerChannel({
  guildId,
  key,
  channelId,
  channelType,
  parentKey = null,
  metadata = null,
} = {}) {
  if (!guildId) throw new Error("guildId requis.");
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) throw new Error("key requis.");
  if (!channelId) throw new Error("channelId requis.");
  if (!channelType) throw new Error("channelType requis.");

  const [record, created] = await ServerChannel.findOrCreate({
    where: { guildId, key: normalizedKey },
    defaults: {
      guildId,
      key: normalizedKey,
      channelId,
      channelType,
      parentKey,
      metadata,
    },
  });

  if (!created) {
    record.channelId = channelId;
    record.channelType = channelType;
    record.parentKey = parentKey ?? record.parentKey;
    record.metadata = metadata ?? record.metadata;
    await record.save();
  }

  return record;
}

export async function getServerChannel(guildId, key) {
  if (!guildId) return null;
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return null;
  return ServerChannel.findOne({ where: { guildId, key: normalizedKey } });
}

export async function getServerChannelId(guildId, key) {
  const record = await getServerChannel(guildId, key);
  return record?.channelId ?? null;
}

export async function listServerChannels(guildId) {
  if (!guildId) return [];
  return ServerChannel.findAll({ where: { guildId } });
}

export async function listServerChannelsByPrefix(guildId, prefix) {
  if (!guildId) return [];
  const normalized = normalizeKey(prefix);
  if (!normalized) return [];
  return ServerChannel.findAll({
    where: {
      guildId,
      key: { [Op.like]: `${normalized}%` },
    },
  });
}

export async function upsertServerRole({ guildId, key, roleId, metadata = null } = {}) {
  if (!guildId) throw new Error("guildId requis.");
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) throw new Error("key requis.");
  if (!roleId) throw new Error("roleId requis.");

  const [record, created] = await ServerRole.findOrCreate({
    where: { guildId, key: normalizedKey },
    defaults: { guildId, key: normalizedKey, roleId, metadata },
  });

  if (!created) {
    record.roleId = roleId;
    record.metadata = metadata ?? record.metadata;
    await record.save();
  }

  return record;
}

export async function getServerRole(guildId, key) {
  if (!guildId) return null;
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return null;
  return ServerRole.findOne({ where: { guildId, key: normalizedKey } });
}

export async function getServerRoleId(guildId, key) {
  const record = await getServerRole(guildId, key);
  return record?.roleId ?? null;
}

export default {
  upsertServerChannel,
  getServerChannel,
  getServerChannelId,
  listServerChannels,
  listServerChannelsByPrefix,
  upsertServerRole,
  getServerRole,
  getServerRoleId,
};
