import { sequelize } from "../../database/db.js";
import Group from "./groupModel.js";
import { Character } from "../character/CharacterModel.js";

export async function withTransaction(callback) {
  return sequelize.transaction(callback);
}

export async function getCharacterById(characterId, options = {}) {
  return Character.findOne({ where: { characterId }, ...options });
}

export async function setCharacterGroupId(characterId, groupId, options = {}) {
  return Character.update({ groupId }, { where: { characterId }, ...options });
}

export async function setCharactersGroupId(characterIds, groupId, options = {}) {
  return Character.update({ groupId }, { where: { characterId: characterIds }, ...options });
}

export async function clearCharacterGroupId(characterId, groupId, options = {}) {
  return Character.update(
    { groupId: null },
    { where: { characterId, groupId }, ...options }
  );
}

export async function clearGroupFromCharacters(groupId, options = {}) {
  return Character.update({ groupId: null }, { where: { groupId }, ...options });
}

export async function createGroup(payload, options = {}) {
  return Group.create(payload, options);
}

export async function deleteGroup(groupId, options = {}) {
  return await Group.destroy({ where: { groupId }, ...options });
}

export async function updateGroupVisibility(groupId, visibility, options = {}) {
  return await Group.update({ visibility }, { where: { groupId }, ...options });
}

export async function getGroupByLeaderId(leaderId){
  return await Group.findOne({where : {leader : leaderId}})
}

export async function getGroupByPk(groupId){
  return await Group.findByPk(groupId);
}

export async function getGroupByPkWithMembers(groupId){
  return await Group.findByPk(groupId, { include: [Character] });
}

export async function getGroupByExpeditionTextChannelId(channelId){
  return await Group.findOne({
    where: { expeditionTextChannelId: channelId },
    include: [Character],
  });
}

export async function getGroupMembers(group) {
  return [... await group.getCharacters()]
}

export async function updateGroupExpeditionState(groupId, values, options = {}) {
  return await Group.update(values, { where: { groupId }, ...options });
}

