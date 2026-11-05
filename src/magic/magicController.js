import * as MagicService from "./MagicService.js";
import * as MagicView from "./magicView.js";
import * as CharacterController from "../character/CharacterController.js";
import * as MagicEffectService from "../magicEffects/magicEffectService.js";

export async function createMagic(interaction) {
  await MagicView.deferEphemeralReply(interaction);

  const targetUser = interaction.options.getUser("character");
  const characterId = targetUser?.id;
  if (!characterId) {
    return MagicView.editReply(interaction, { content: "Personnage cible introuvable." });
  }

  const character = await CharacterController.getCharacterById(characterId);
  if (!character) {
    return MagicView.editReply(interaction, { content: "Aucun personnage trouve pour cet utilisateur." });
  }

  const newMagic = await MagicService.createMagic(character);
  if (!newMagic) {
    return MagicView.editReply(interaction, { content: "Echec de creation de la magie." });
  }

  const rawEffects = await newMagic.getMagicEffects();
  const effects = await Promise.all(
    (Array.isArray(rawEffects) ? rawEffects : []).map((effect) => MagicEffectService.getMagicEffect(effect))
  );
  const safeEffects = effects.filter(Boolean);

  const magicMessage = await MagicView.createAdminMessageForMagic(newMagic, safeEffects);
  return MagicView.editReply(interaction, magicMessage);
}

export async function showMagics(interaction) {
  await MagicView.deferEphemeralReply(interaction);
}