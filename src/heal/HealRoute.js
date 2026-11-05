import * as CharacterRoute from "../character/CharacterRoute.js";

export async function getCharacterForDiscordUser(userId) {
  return CharacterRoute.getCharacterForDiscordUser(userId);
}

export async function saveCharacter(character) {
  return CharacterRoute.saveCharacter(character);
}

export default { getCharacterForDiscordUser, saveCharacter };

