import { getServerSetupTemplate } from "../../data/serverSetupTemplates.js";
import * as serverSetupRoute from "./serverSetupRoute.js";
import * as serverSetupDbRoute from "./serverSetupDbRoute.js";
import * as serverSetupRoleRoute from "./serverSetupRoleRoute.js";
import gods from "../../data/gods.js";

function normalizeKey(value) {
  return (value || "").toString().trim().toLowerCase();
}

function listFamiliaKeysFromGods() {
  return Object.keys(gods || {}).map(normalizeKey).filter(Boolean);
}

function buildKey(...parts) {
  return parts.filter(Boolean).join(":");
}

function capitalize(name) {
  const text = (name || "").toString().trim();
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function ensureServerRoles(guild, { dryRun } = {}) {
  const guildId = guild.id;
  const report = [];

  const ensure = async (key, name, color = null) => {
    if (dryRun) {
      report.push({ key, name, created: true });
      return;
    }
    const ensured = await serverSetupRoleRoute.ensureRole(guild, { name, color });
    await serverSetupDbRoute.upsertServerRole({
      guildId,
      key,
      roleId: ensured.role.id,
      metadata: { name },
    });
    report.push({ key, name, created: ensured.created });
  };

  await ensure(buildKey("role", "aventurier"), "Aventurier", 0x3498db);
  await ensure(buildKey("role", "expedition"), "En expedition", 0xf1c40f);

  for (const familiaKey of listFamiliaKeysFromGods()) {
    const familiaName = capitalize(familiaKey);
    await ensure(buildKey("role", "familia", familiaKey), familiaName, 0x2ecc71);
    await ensure(buildKey("role", "familia_leader", familiaKey), `Leader ${familiaName}`, 0xe67e22);
  }

  return report;
}

async function ensureFamiliaCategories(guild, familiaChannels, { dryRun, afterCategory } = {}) {
  const familiaKeys = listFamiliaKeysFromGods();
  const familiaReport = { name: "familias", created: false, channels: [] };

  const basePosition = typeof afterCategory?.rawPosition === "number" ? afterCategory.rawPosition + 1 : null;
  let positionCursor = basePosition;

  for (const familiaKey of familiaKeys) {
    const categoryName = familiaKey;
    let category;
    let categoryCreated = false;
    if (dryRun) {
      category = serverSetupRoute.findCategoryByName(guild, categoryName) || { id: "dry", name: categoryName };
      categoryCreated = category?.id === "dry";
    } else {
      const ensured = await serverSetupRoute.ensureCategory(guild, categoryName);
      category = ensured.category;
      categoryCreated = ensured.created;
      await serverSetupRoute.fetchGuildChannels(guild);

      if (positionCursor !== null && typeof category?.setPosition === "function") {
        await category.setPosition(positionCursor).catch(() => {});
        positionCursor += 1;
      }

      await serverSetupDbRoute.upsertServerChannel({
        guildId: guild.id,
        key: buildKey("familia", familiaKey, "category"),
        channelId: category.id,
        channelType: "category",
        parentKey: null,
        metadata: { familiaKey },
      });
    }

    for (const spec of familiaChannels) {
      const channelName = spec?.name;
      if (!channelName) continue;
      if (dryRun) continue;

      const ensured =
        spec.type === "voice"
          ? await serverSetupRoute.ensureVoiceChannel(guild, category.id, channelName)
          : await serverSetupRoute.ensureTextChannel(guild, category.id, channelName);

      await serverSetupRoute.fetchGuildChannels(guild);

      const lowered = channelName.toLowerCase();
      const subKey = lowered.includes("annonce")
        ? "annonce"
        : lowered.includes("discussion")
          ? "discussion"
          : lowered.includes("mission")
            ? "missions"
            : normalizeKey(channelName).replace(/[^a-z0-9]+/g, "_");

      await serverSetupDbRoute.upsertServerChannel({
        guildId: guild.id,
        key: buildKey("familia", familiaKey, subKey),
        channelId: ensured.channel.id,
        channelType: spec.type === "voice" ? "voice" : "text",
        parentKey: buildKey("familia", familiaKey, "category"),
        metadata: { familiaKey, name: channelName },
      });
    }

    familiaReport.channels.push({ type: "category", name: categoryName, created: categoryCreated });
  }

  return familiaReport;
}

export async function setupServerStructure(guild, { template = "default", dryRun = false } = {}) {
  if (!guild) throw new Error("Guilde introuvable.");

  const tpl = getServerSetupTemplate(template);
  await serverSetupRoute.fetchGuildChannels(guild);

  const report = {
    template: template || "default",
    dryRun: Boolean(dryRun),
    categories: [],
    roles: [],
    createdCount: 0,
    existingCount: 0,
  };

  // 0) Roles globaux + roles de familias
  report.roles = await ensureServerRoles(guild, { dryRun });

  // 1) Structure globale (template.categories)
  let familiaCreated = false;
  let informationCategory = null;
  for (const categorySpec of tpl.categories || []) {
    const categoryName = categorySpec?.name;
    const categoryKey = normalizeKey(categorySpec?.key || categorySpec?.name);
    if (!categoryName) continue;

    let category;
    let categoryCreated = false;
    if (dryRun) {
      category = serverSetupRoute.findCategoryByName(guild, categoryName) || { id: "dry", name: categoryName };
      categoryCreated = category?.id === "dry";
    } else {
      const ensured = await serverSetupRoute.ensureCategory(guild, categoryName);
      category = ensured.category;
      categoryCreated = ensured.created;
      await serverSetupRoute.fetchGuildChannels(guild);
    }

    const categoryEntry = { name: categoryName, created: categoryCreated, channels: [] };
    report.categories.push(categoryEntry);
    report[categoryCreated ? "createdCount" : "existingCount"] += 1;

    if (!dryRun) {
      await serverSetupDbRoute.upsertServerChannel({
        guildId: guild.id,
        key: buildKey("category", categoryKey),
        channelId: category.id,
        channelType: "category",
        parentKey: null,
        metadata: { name: categoryName, categoryKey },
      });
    }

    if (categoryKey === "information") {
      informationCategory = category;
      if (tpl.familias?.enabled) {
        const familiaChannels = Array.isArray(tpl.familias.channels) ? tpl.familias.channels : [];
        const familiaReport = await ensureFamiliaCategories(guild, familiaChannels, {
          dryRun,
          afterCategory: informationCategory,
        });
        report.categories.push(familiaReport);
        familiaCreated = true;
      }
    }

    for (const channelSpec of categorySpec.channels || []) {
      const channelName = channelSpec?.name;
      const channelType = channelSpec?.type;
      const channelKey = normalizeKey(channelSpec?.key || channelSpec?.name);
      if (!channelName || !channelType) continue;

      if (dryRun) {
        categoryEntry.channels.push({ type: channelType, name: channelName, created: true });
        report.createdCount += 1;
        continue;
      }

      let ensured;
      if (channelType === "voice") {
        ensured = await serverSetupRoute.ensureVoiceChannel(guild, category.id, channelName);
      } else {
        ensured = await serverSetupRoute.ensureTextChannel(guild, category.id, channelName);
      }

      categoryEntry.channels.push({ type: channelType, name: channelName, created: ensured.created });
      report[ensured.created ? "createdCount" : "existingCount"] += 1;
      await serverSetupRoute.fetchGuildChannels(guild);

      await serverSetupDbRoute.upsertServerChannel({
        guildId: guild.id,
        key: buildKey("channel", categoryKey, channelKey),
        channelId: ensured.channel.id,
        channelType: channelType === "voice" ? "voice" : "text",
        parentKey: buildKey("category", categoryKey),
        metadata: { name: channelName, categoryKey, channelKey },
      });
    }
  }

  // 2) Fallback si pas de categorie "information" dans le template
  if (tpl.familias?.enabled && !familiaCreated) {
    const familiaChannels = Array.isArray(tpl.familias.channels) ? tpl.familias.channels : [];
    const familiaReport = await ensureFamiliaCategories(guild, familiaChannels, { dryRun, afterCategory: null });
    report.categories.push(familiaReport);
  }

  return report;
}

export async function getServerChannelId(guildId, key) {
  return await serverSetupDbRoute.getServerChannelId(guildId, key);
}

export async function getServerCategoryId(guildId, categoryKey) {
  return await getServerChannelId(guildId, buildKey("category", normalizeKey(categoryKey)));
}

export async function getFamiliaChannelId(guildId, familiaKey, subKey) {
  return await getServerChannelId(guildId, buildKey("familia", normalizeKey(familiaKey), subKey));
}

export async function getFamiliaRoleId(guildId, familiaKey) {
  return await serverSetupDbRoute.getServerRoleId(guildId, buildKey("role", "familia", normalizeKey(familiaKey)));
}

export async function getRoleId(guildId, key) {
  return await serverSetupDbRoute.getServerRoleId(guildId, buildKey("role", normalizeKey(key)));
}

export default { setupServerStructure, getServerChannelId, getServerCategoryId, getFamiliaChannelId, getFamiliaRoleId, getRoleId };


