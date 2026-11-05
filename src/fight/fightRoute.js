import * as FightModel from "./fightModel.js"
const fightList = new Map();
let id = 0;

export function newFight(floorNumber){
    const fight = new FightModel.FightModel(++id, floorNumber);
    fightList.set(id, fight);
    return fight;
}

export function getFightById(id){
    return fightList.get(id);
}

export function getFightByGroupId(groupId){
    const key = String(groupId);
    for (const fight of fightList.values()){
        if (String(fight?.groupId) === key){
            return fight;
        }
    }
    return null;
}

export function deleteFightById(id){
    return fightList.delete(id);
}
