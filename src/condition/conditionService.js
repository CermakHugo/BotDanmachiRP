import * as ConditionRoute from "./conditionRoute.js"
import {activeConditions} from "../../data/effect/activeCondition.js"
import { scaleConditions } from "../../data/effect/scaleCondition.js";

const allActiveConditions = Object.values(activeConditions);
const allScaleConditions = Object.values(scaleConditions)

export async function createConditionForEffect(effect){
    const activeCondition = await getActiveConditionForEffect(effect);
    const scaleCondition = await getScaleConditionForEffect(effect);
    const activeValue  = Math.floor(activeCondition.activeValue * Math.random()) + 1 ;
    const condition = {
        activeCondition : activeCondition.name,
        scaleCondition : scaleCondition.name,
        isFlat: false,
        activeValue: activeValue
    };
    const newCondition = await ConditionRoute.createCondition(condition);
    return newCondition;
}

function getActiveConditionForEffect(effect){
    const possibleActiveCondition = allActiveConditions.filter((condition) => {
        const isForbidenCondition = effect.forbidenActiveConditions.includes(condition);
        return !isForbidenCondition
    });
    const randomNumber = Math.floor(Math.random() * possibleActiveCondition.length);
    const selectedActiveCondition = possibleActiveCondition[randomNumber];
    return selectedActiveCondition;
}

function getScaleConditionForEffect(effect){
    const possibleScaleCondition = allScaleConditions.filter((condition) => {
        const isForbidenCondition = effect.forbidenActiveConditions.includes(condition);
        return !isForbidenCondition
    });
    const randomNumber = Math.floor(Math.random() * possibleScaleCondition.length);
    const selectedScaleCondition = possibleScaleCondition[randomNumber];
    return selectedScaleCondition;
}

export function getAnotherCondition(effect, firstCondition){
    if( firstCondition == activeConditions.SPELL_CAST){
        return firstCondition
    } else {
        const randomNumber = Math.random();
        if(randomNumber > 0.7){
            const newCondition = createConditionForEffect(effect);
            return newCondition
        }else{
            return ConditionRoute.createCondition({
                activeCondition : firstCondition.activeCondition,
                scaleCondition : firstCondition.scaleCondition,
                isFlat: firstCondition.isFlat,
                activeValue: firstCondition.activeValue
            })
        }
    }
}

export async function getEffectCondition(capacityEffect){
    try{
        const condition = await capacityEffect.getCondition();
        console.log(`Condition was find for capacity effect ${capacityEffect.capacityEffectId} : conditionId = ${condition.conditionId}`)
        const activeCondition = await getActiveConditionFromCondition(condition);
        console.log(`Active condition was find for condition ${condition.conditionId} : activeCondition = ${activeCondition.name}`)
        const scaleCondition = await getScaleConditionFromCondition(condition);
        console.log(`Scale condition was find for condition ${condition.conditionId} : activeCondition = ${scaleCondition.name}`)
        return {
            activeCondition : activeCondition,
            scaleCondition : scaleCondition,
            AoE : condition.AoE,
            isFlat : condition.isFlat,
            value : condition.value
        }
    } catch(e){
        console.error(`Une erreur est survenu lors de la récupération d\'une condition pour la capacité ${capacityEffect.capacityEffectId} : \n ${e}`)
    }
}

export function getActiveConditionFromCondition(condition){
    return allActiveConditions.find(activeCondition => {
        return activeCondition.name === condition.activeCondition
    })
}

export function getScaleConditionFromCondition(condition){
    return allScaleConditions.find(scaleCondition => {
        return scaleCondition.name === condition.scaleCondition
    })
}


