import MagicEffect from "./magicEffectModel.js";


export async function createMagicEffect(magicEffect){
    try {
        const newMagicEffect = await MagicEffect.create(magicEffect);
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