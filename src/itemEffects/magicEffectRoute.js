import MagicEffect from "./magicEffectModel.js";

MagicEffect.afterCreate(async (magicEffect, condition) => {
    if (!condition) {
        throw new Error("Une condition doit être fournies lors de la création d'un effet.");
    }
    try{
        magicEffect.addCondition(condition)
    }catch (error) {
        console.error("Erreur lors de la création de condition pour l'effet :", error);
    }
})

export async function createMagicEffect(magicEffect, condition){
    try {
        const newMagicEffect = await MagicEffect.create(magicEffect, condition);
        console.log(`User ${magicEffect.magicEffectId} has created the magicEffect ${magicEffect.name}.`);
        return newMagicEffect;
    } catch(error) {
        console.error("Erreur lors de la création de l\'effet :\n", error);
        return ;
    }
}

export async function findMagicEffectById(magicEffectId){
    try{
        return await MagicEffect.findByPk(magicEffectId);
    } catch (error){
        console.error(`Erreur lors de la recherche d'effet [MagicEffect Id = ${magicEffectId}] :`, error);
    }
}