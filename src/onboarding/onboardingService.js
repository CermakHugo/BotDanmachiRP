import * as onboardingRoute from "./onboardingRoute.js";

function toChannelMention(channelId, fallbackLabel) {
  if (channelId) return `<#${channelId}>`;
  return fallbackLabel;
}

function normalizeFamiliaKey(value) {
  return (value || "").toString().trim().toLowerCase();
}

function buildSteps(state, channels) {
  return [
    {
      key: "character",
      done: state.hasCharacter,
      label: "Creer ton personnage",
      command: `Commande: \`/creer_personnage\`\nSalon recommande: ${channels.inscription}`,
      detail: state.hasCharacter
        ? `Personnage detecte: **${state.characterName}**`
        : "Aucun personnage detecte",
    },
    {
      key: "familia",
      done: state.hasFamilia,
      label: "Rejoindre une familia",
      command: `Commande: \`/rejoindre_familia\`\nSalon recommande: ${channels.inscription}`,
      detail: state.hasFamilia
        ? `Familia actuelle: **${state.familiaName}**`
        : "Aucune familia",
    },
    {
      key: "weapon",
      done: state.hasWeapon,
      label: "Choisir une arme de depart",
      command: `Action: menu de selection\nSalon recommande: ${channels.familiaDiscussion}`,
      detail: state.hasWeapon ? "Arme equipee" : "Arme de depart non choisie",
    },
    {
      key: "armor",
      done: state.hasArmor,
      label: "Choisir une armure de depart",
      command: `Action: menu apres le choix de l'arme\nSalon recommande: ${channels.familiaDiscussion}`,
      detail: state.hasArmor ? "Armure equipee" : "Armure de depart non choisie",
    },
  ];
}

function getNextAction(steps) {
  const pending = steps.find((step) => !step.done);
  if (!pending) {
    return {
      title: "Parcours termine",
      instruction: "Tu as termine ton demarrage. Tu peux maintenant partir en aventure librement.",
    };
  }

  return {
    title: `Prochaine etape: ${pending.label}`,
    instruction: pending.command,
  };
}

export async function getOnboardingState(userId, guildId = null) {
  const character = await onboardingRoute.getCharacterByUserId(userId);
  const equipment = await onboardingRoute.getEquipmentByCharacterId(character?.characterId);

  const hasCharacter = Boolean(character);
  const hasFamilia = Boolean(character?.familia && character.familia !== "Aucune");
  const hasWeapon = Boolean(equipment?.rightHand);
  const hasArmor = Boolean(equipment?.armor);

  const familiaKey = normalizeFamiliaKey(character?.familia);

  const [guildInscriptionChannelId, familiaDiscussionChannelId] = await Promise.all([
    onboardingRoute.getServerChannelId(guildId, "channel:guilde:inscription"),
    hasFamilia ? onboardingRoute.getFamiliaChannelId(guildId, familiaKey, "discussion") : Promise.resolve(null),
  ]);

  const channels = {
    inscription: toChannelMention(guildInscriptionChannelId, "#guilde / #inscription"),
    familiaDiscussion: toChannelMention(familiaDiscussionChannelId, "salon discussion de ta familia"),
  };

  const state = {
    hasCharacter,
    hasFamilia,
    hasWeapon,
    hasArmor,
    characterName: character?.name || null,
    familiaName: character?.familia || null,
    isDead: Boolean(character?.isDead),
  };

  const steps = buildSteps(state, channels);
  const next = getNextAction(steps);

  return {
    state,
    steps,
    next,
    completionPercent: Math.round((steps.filter((step) => step.done).length / steps.length) * 100),
  };
}

export default {
  getOnboardingState,
};