import CapacityEffect from "./capacityEffectModel.js";

CapacityEffect.afterCreate(async (capacityEffect, condition) => {
    if (!condition) {
        throw new Error("Une condition doit être fournies lors de la création d'un effet.");
    }
    try{
        await capacityEffect.setCondition(condition)
    }catch (error) {
        console.error("Erreur lors de la création de condition pour l'effet :", error);
    }
})

export async function createCapacityEffect(capacityEffect, condition){
    try {
        const newCapacityEffect = await CapacityEffect.create(capacityEffect, condition);
        console.log(`User ${capacityEffect.capacityEffectId} has created the capacityEffect ${capacityEffect.name}.`);
        return newCapacityEffect;
    } catch(error) {
        console.error("Erreur lors de la création de l\'effet :\n", error);
        return ;
    }
}

export async function findCapacityEffectById(capacityEffectId){
    try{
        return await CapacityEffect.findByPk(capacityEffectId);
    } catch (error){
        console.error(`Erreur lors de la recherche d'effet [CapacityEffect Id = ${capacityEffectId}] :`, error);
    }
}