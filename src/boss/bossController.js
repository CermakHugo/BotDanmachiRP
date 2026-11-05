import { MessageFlags } from "discord.js";
import * as BossService from "./bossService.js";

function ephemeral(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

export async function createBossFromCommand(interaction) {
  try {
    const bossId = interaction.options.getString("boss_id", true).trim();
    const name = interaction.options.getString("nom", true).trim();
    const floor = interaction.options.getInteger("etage", true);
    const level = interaction.options.getInteger("niveau", true);
    const strength = interaction.options.getInteger("strength", true);
    const agility = interaction.options.getInteger("agility", true);
    const dexterity = interaction.options.getInteger("dexterity", true);
    const intelligence = interaction.options.getInteger("intelligence", true);
    const endurance = interaction.options.getInteger("endurance", true);
    const spawnIntervalMinutes = interaction.options.getInteger("spawn_minutes", true);
    const description = interaction.options.getString("description") ?? null;
    const image = interaction.options.getString("image") ?? null;
    const isActive = interaction.options.getBoolean("actif");

    const boss = await BossService.createBoss({
      bossId,
      name,
      description,
      floor,
      level,
      strength,
      agility,
      dexterity,
      intelligence,
      endurance,
      image,
      spawnIntervalMinutes,
      isActive: isActive ?? true,
    });

    return interaction.reply(
      ephemeral(
        `Boss cree: ${boss.name} (${boss.bossId}) | etage ${boss.floor} | niv ${boss.level} | ` +
        `STR ${boss.strength} AGI ${boss.agility} DEX ${boss.dexterity} INT ${boss.intelligence} END ${boss.endurance} | ` +
        `HP ${boss.health}/${boss.maxHealth} | spawn ${boss.spawnIntervalMinutes} min.`
      )
    );
  } catch (error) {
    return interaction.reply(ephemeral(error?.message || "Impossible de creer ce boss."));
  }
}

export default { createBossFromCommand };
