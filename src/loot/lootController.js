import * as lootService from "./lootService.js";
import * as itemService from "../item/itemService.js";
import * as MonsterRoute from "../monster/MonsterRoute.js";
import * as BossService from "../boss/bossService.js";
import { MessageFlags } from "discord.js";
import { searchItems } from "../item/itemRoute.js";

function ephemeral(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

export async function addLootDrop(interaction) {
  try {
    const target = interaction.options.getString("cible", true);
    const itemIdentifier = interaction.options.getString("item", true);
    const monsterId = interaction.options.getString("monstre");
    const bossQuery = interaction.options.getString("boss");
    const action = interaction.options.getString("action");
    const shardSize = interaction.options.getString("taille") || null;
    const dropChance = interaction.options.getNumber("chance") ?? 1;
    const minQuantity = interaction.options.getInteger("min") ?? 1;
    const maxQuantity = interaction.options.getInteger("max") ?? minQuantity;

    const item = await itemService.findItem(itemIdentifier);

    if (target === "monster") {
      if (!monsterId) throw new Error("Le monstre est obligatoire.");
      const monster = await MonsterRoute.findMonsterById(monsterId);
      if (!monster) throw new Error("Monstre introuvable.");
      await lootService.addMonsterLootDrop({
        monsterId: monster.monsterId,
        monsterName: monster.name,
        item,
        dropChance,
        minQuantity,
        maxQuantity,
        shardSize,
      });
      return interaction.reply(ephemeral(`Loot ajoute pour le monstre '${monster.name}': ${item.name}.`));
    }

    if (target === "boss") {
      if (!bossQuery) throw new Error("Le boss est obligatoire.");
      const boss = await BossService.resolveBoss(bossQuery);
      await lootService.addBossLootDrop({
        bossId: boss.bossId,
        bossName: boss.name,
        item,
        dropChance,
        minQuantity,
        maxQuantity,
        shardSize,
      });
      return interaction.reply(ephemeral(`Loot ajoute pour le boss '${boss.name}': ${item.name}.`));
    }

    await lootService.addExplorationLootDrop({
      action: action || null,
      item,
      dropChance,
      minQuantity,
      maxQuantity,
      shardSize,
    });
    return interaction.reply(ephemeral(`Loot ajoute pour l'exploration${action ? ` (${action})` : ""}: ${item.name}.`));
  } catch (error) {
    return interaction.reply(ephemeral(error.message || "Impossible d'ajouter ce loot."));
  }
}

async function resolveMonster(monsterQuery) {
  const q = (monsterQuery || "").toString().trim();
  if (!q) throw new Error("Monstre requis.");

  const direct = await MonsterRoute.findMonsterById(q).catch(() => null);
  if (direct) return direct;

  const matches = await MonsterRoute.searchMonstersByName(q, 10).catch(() => []);
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error("Monstre introuvable.");

  const lines = matches.slice(0, 5).map((m) => `- ${m.monsterId}: ${m.name}`);
  throw new Error(`Plusieurs monstres trouvent. Precise:\n${lines.join("\n")}`);
}

async function resolveItem(itemQuery) {
  try {
    return await itemService.findItem(itemQuery);
  } catch (error) {
    const hits = await searchItems(itemQuery, 10).catch(() => []);
    if (hits.length === 1) {
      const hit = hits[0];
      return itemService.findItem(`${hit.category}:${hit.item.id}`);
    }
    if (!hits.length) {
      throw new Error(error?.message || "Item introuvable.");
    }
    const lines = hits.slice(0, 5).map((hit) => `- ${hit.category}:${hit.item.id} ${hit.item.name}`);
    throw new Error(`Plusieurs items trouvent. Utilise category:id:\n${lines.join("\n")}`);
  }
}

export async function addLootFromCommand(interaction) {
  try {
    const target = interaction.options.getString("cible", true);
    const monsterQuery = interaction.options.getString("monstre");
    const bossQuery = interaction.options.getString("boss");
    const itemQuery = interaction.options.getString("item", true);
    const actionRaw = interaction.options.getString("action") || "any";
    const shardSize = interaction.options.getString("taille") || null;
    const dropChance = interaction.options.getNumber("chance") ?? 1;
    const minQuantity = interaction.options.getInteger("min") ?? 1;
    const maxQuantity = interaction.options.getInteger("max") ?? minQuantity;

    const item = await resolveItem(itemQuery);
    const chance = clampNumber(dropChance, 0, 1);
    const minQty = clampNumber(minQuantity, 1, 9999);
    const maxQty = clampNumber(maxQuantity, minQty, 9999);

    if (target === "monster") {
      const monster = await resolveMonster(monsterQuery);
      await lootService.addMonsterLootDrop({
        monsterId: monster.monsterId,
        monsterName: monster.name,
        item,
        dropChance: chance,
        minQuantity: minQty,
        maxQuantity: maxQty,
        shardSize,
      });
      return interaction.reply(ephemeral(`Loot enregistre pour '${monster.name}': ${item.name}.`));
    }

    if (target === "boss") {
      const boss = await BossService.resolveBoss(bossQuery);
      await lootService.addBossLootDrop({
        bossId: boss.bossId,
        bossName: boss.name,
        item,
        dropChance: chance,
        minQuantity: minQty,
        maxQuantity: maxQty,
        shardSize,
      });
      return interaction.reply(ephemeral(`Loot enregistre pour le boss '${boss.name}': ${item.name}.`));
    }

    const action = (actionRaw || "").toString().trim().toLowerCase();
    const normalizedAction = !action || action === "any" ? null : action;
    await lootService.addExplorationLootDrop({
      action: normalizedAction,
      item,
      dropChance: chance,
      minQuantity: minQty,
      maxQuantity: maxQty,
      shardSize,
    });
    return interaction.reply(ephemeral(`Loot enregistre pour l'exploration: ${item.name}.`));
  } catch (error) {
    return interaction.reply(ephemeral(error?.message || "Impossible d'ajouter ce loot."));
  }
}

export default { addLootDrop, addLootFromCommand };
