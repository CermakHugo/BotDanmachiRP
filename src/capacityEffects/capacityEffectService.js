import * as CapacityEffectRoute from "./capacityEffectRoute.js"
import * as ConditionService from "../condition/conditionService.js"
import {effects} from "../../data/effect/effects.js"

const allCapacityEffects = Object.values(effects);

export async function createCapacityEffectWithCondition(capacityEffect, condition){
    const power = Math.floor(Math.random() * ConditionService.getScaleConditionFromCondition(condition).power);
    const createdCapacityEffect = {
        capacityEffectType : capacityEffect.type,
        effect: capacityEffect.id,
        effectPower: power,
    }
    return await CapacityEffectRoute.createCapacityEffect(createdCapacityEffect, condition)
}


export async function createRandomCapacityEffect(){
    const capacityEffect = await getRandomCapacityEffect();
    const condition = await ConditionService.createConditionForEffect(capacityEffect);
    const newCapacityEffect = await  createCapacityEffectWithCondition(capacityEffect, condition);
    return newCapacityEffect
}

export async function createAnotherCapacityEffect(firstCapacityEffect){
    const anotherCapacityEffect = await getAnotherCapacityEffect(firstCapacityEffect);
    const firstCondition = await firstCapacityEffect.getCondition();
    const anotherCondition = await ConditionService.getAnotherCondition(anotherCapacityEffect, firstCondition);
    const newCapacityEffect = await createCapacityEffectWithCondition(anotherCapacityEffect, anotherCondition);
    return newCapacityEffect;
}

export function getAnotherCapacityEffect(firstCapacityEffect){
    const capacityEffectType = firstCapacityEffect.capacityEffectType;
    const authorizedCapacityEffects = allCapacityEffects.filter((capacityEffect) => {return capacityEffect.category == capacityEffectType});
    const standardAutorizedCapacityEffects = standardizationCapacityEffect(authorizedCapacityEffects);

    const randomNumber = Math.random();
    const standardAutorizedCapacityEffectsKeys = [...standardAutorizedCapacityEffects.keys()];
    const capacityEffect = standardAutorizedCapacityEffectsKeys.find((capacityEffect) => {
        return standardAutorizedCapacityEffects.get(capacityEffect) >= randomNumber
    });
    return capacityEffect;
}

function getRandomCapacityEffect(){
    const randomNumber = Math.random();
    const standardCapacityEffects = standardizationCapacityEffect(allCapacityEffects);
    const standardCapacityEffectsKeys = [...standardCapacityEffects.keys()];
    const capacityEffect = standardCapacityEffectsKeys.find((capacityEffect) => {
        return standardCapacityEffects.get(capacityEffect) >= randomNumber
    });
    return capacityEffect;
}

function standardizationCapacityEffect(capacityEffects){
    const standardizationCapacityEffects = new Map();
    const rarityMax = capacityEffects.reduce((final, capacityEffect) => {
        return final += Math.floor(capacityEffect.rarity);
    }, 0)
    let currentStandardRarity = 0;
    capacityEffects.forEach( (capacityEffect)=>{
        currentStandardRarity += capacityEffect.rarity / rarityMax;
        standardizationCapacityEffects.set(capacityEffect, currentStandardRarity);
         
    })
    return standardizationCapacityEffects;
}

export function getCapacityEffect(capacityEffect){
    return allCapacityEffects.find((effect) => {return capacityEffect.effect == effect.id});
}

export async function getCapacityEffectDescription(capacityEffect){
    try {
        const effect = await getCapacityEffect(capacityEffect);
        const condition = await ConditionService.getEffectCondition(capacityEffect);
        const text = `${effect.description} d\'une valeur de ${capacityEffect.effectPower} % de ${condition.scaleCondition.name} ${condition.activeCondition.description}, ${condition.activeCondition.activeValue} fois. `
        console.log(text)
        return text
    } catch(e){
        console.error(`Une erreur est survenu dans la récupération de la description de l\'effet ${capacityEffect.capacityEffectId} : \n ${e}`)
    }
}

export async function getPowerCapacityEffect(effect, fighter, target){
    const condition = await effect.getCondition();
    const scaleCondition = await ConditionService.getScaleConditionFromCondition(condition);
    const power = effect.effectPower;
    const finalPower = await scaleCondition.getPower(power, fighter, target);
    return finalPower
}