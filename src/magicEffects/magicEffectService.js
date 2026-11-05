import * as MagicEffectRoute from "./magicEffectRoute.js"
import {effects} from "../../data/effect/effects.js"

const allMagicEffects = Object.values(effects);

export async function createMagicEffect(magicEffect){
    const createdMagicEffect = {
        effect: magicEffect.id,
    }
    return await MagicEffectRoute.createMagicEffect(createdMagicEffect)
}

export function getMagicEffect(magicEffect){
    return allMagicEffects.find((effect) => {return magicEffect.effect == effect.id});
}

export function getMagicEffectDescription(magicEffect){
    const effect = getMagicEffect(magicEffect);
    return effect.description;
}

export function getTurnCostMagicEffect(magicEffect){
    const effect = getMagicEffect(magicEffect);
    return effect.turnCost;
}

export function getManaCostMagicEffect(magicEffect){
    const effect = getMagicEffect(magicEffect);
    return effect.manaCost;
}

export async function createRandomMagicEffect(){
    const magicEffect = await getRandomMagicEffect();
    const newMagicEffect = await createMagicEffect(magicEffect);
    return newMagicEffect
}

export async function createAnotherMagicEffect(firstMagicEffect){
    const anotherMagicEffect = await getAnotherMagicEffect(firstMagicEffect);
    const newMagicEffect = await createMagicEffect(anotherMagicEffect);
    return newMagicEffect;
}

export function getAnotherMagicEffect(firstMagicEffect){
    const firstEffect = getMagicEffect(firstMagicEffect);
    const magicEffectType = firstEffect.type;
    const authorizedMagicEffects = allMagicEffects.filter((magicEffect) => {return magicEffect.type == magicEffectType});
    const standardAutorizedMagicEffects =  standardizationMagicEffect(authorizedMagicEffects);

    const randomNumber = Math.random();
    const standardAutorizedMagicEffectsKeys = [...standardAutorizedMagicEffects.keys()];
    const magicEffect = standardAutorizedMagicEffectsKeys.find((magicEffect) => {
        return standardAutorizedMagicEffects.get(magicEffect) >= randomNumber
    })
    return magicEffect 
}

function getRandomMagicEffect(){
    const randomNumber = Math.random();
    const standardMagicEffects = standardizationMagicEffect(allMagicEffects);
    const standardMagicEffectsKeys = [...standardMagicEffects.keys()]
    const magicEffect = standardMagicEffectsKeys.find((magicEffect) => {
        return standardMagicEffects.get(magicEffect) >= randomNumber
    })
    return magicEffect 
}

function standardizationMagicEffect(magicEffects){
    const standardizationMagicEffects = new Map();
    const rarityMax = magicEffects.reduce((final, magicEffect) => {
        return final += Math.floor(magicEffect.rarity);
    }, 0)
    let currentStandardRarity = 0;
    magicEffects.forEach( (magicEffect)=>{
        currentStandardRarity += magicEffect.rarity / rarityMax; 
        standardizationMagicEffects.set(magicEffect, currentStandardRarity);
    })
    return standardizationMagicEffects;
}