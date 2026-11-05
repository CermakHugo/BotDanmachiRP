function normalizeName(name) {
  return (name || "").toString().trim().toLowerCase();
}

export async function fetchGuildRoles(guild) {
  if (!guild) return null;
  try {
    return await guild.roles.fetch();
  } catch {
    return null;
  }
}

export function findRoleByName(guild, name) {
  const target = normalizeName(name);
  if (!guild || !target) return null;
  return guild.roles.cache.find((r) => normalizeName(r.name) === target) || null;
}

export async function ensureRole(guild, { name, color = null } = {}) {
  if (!guild) throw new Error("Guilde introuvable.");
  if (!name) throw new Error("Nom de role requis.");

  await fetchGuildRoles(guild);
  const existing = findRoleByName(guild, name);
  if (existing) return { role: existing, created: false };

  const payload = { name, reason: "Server setup automation" };
  if (color) payload.color = color;
  const created = await guild.roles.create(payload);
  await fetchGuildRoles(guild);
  return { role: created, created: true };
}

export default { fetchGuildRoles, findRoleByName, ensureRole };

