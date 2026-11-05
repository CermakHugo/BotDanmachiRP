import * as MagicEffectRoute from "./magicMagicEffectRoute.js"
import * as ConditionService from "../condition/conditionService.js"
import {effects} from "../../data/effect/effects.js"

const allMagicEffects = Object.values(effects);

export async function createMagicEffectWithCondition(magicEffect, condition){
    const createdMagicEffect = {
        magicEffectType : magicEffect.type,
        magicEffect: magicEffect.id,
        isFlat: true,
        power: 0,
    }
    return await MagicEffectRoute.createMagicEffect(magicEffect, condition)
}

export async function createRandomMagicMagicEffect(){
    const magicEffect = await getRandomMagicEffect();
    const condition = await ConditionService.getSpellCastCondition();
    const newMagicEffect = await createMagicEffectWithCondition(magicEffect, condition);
    return newMagicEffect;
}

export async function createRandomMagicEffect(){
    const magicEffect = await getRandomMagicEffect();
    const condition = await ConditionService.getConditionForMagicEffect(magicEffect);
    const newMagicEffect = await  createMagicEffectWithCondition(magicEffect, condition);
    return newMagicEffect
}

export async function createAnotherMagicEffect(firstMagicEffect){
    const anotherMagicEffect = await getAnotherMagicEffect(firstMagicEffect);
    const firstCondition = firstMagicEffect.getCondition();
    const anotherCondition = await ConditionService.getAnotherCondition(anotherMagicEffect, firstCondition)
    const newMagicEffect = await createMagicEffectWithCondition(anotherMagicEffect, anotherCondition);
    return newMagicEffect;
}

export function getAnotherMagicEffect(firstMagicEffect){
    const magicEffectType = firstMagicEffect.magicEffectType;
    const authorizedMagicEffects = allMagicEffects.filter((magicEffect) => {return magicEffect.category == magicEffectType});
    const standardAutorizedMagicEffects =  standardizationMagicEffect(authorizedMagicEffects);

    const randomNumber = Math.random();
    standardAutorizedMagicEffects.forEach((magicEffect, rarity) => {
        if(rarity >= randomNumber){
            return magicEffect
        }
    }) 
}

function getRandomMagicEffect(){
    const randomNumber = Math.random();
    const standardMagicEffects = standardizationMagicEffect(allMagicEffects);
    standardMagicEffects.forEach((magicEffect, rarity) => {
        if(rarity >= randomNumber){
            return magicEffect
        }
    }) 
}

function standardizationMagicEffect(magicEffects){
    const standardizationMagicEffects = new Map();
    const rarityMax = magicEffects.reduce((final, magicEffect) => {
        final += magicEffect.rarity;
    })
    let currentStandardRarity = 0;
    magicEffects.forEach( (magicEffect)=>{
        standardizationMagicEffects.set(magicEffect, magicEffectStandardRarityValue);
        currentStandardRarity += Math.floor(magicEffect.rarity / rarityMax); 
    })
    return standardizationMagicEffects;
}