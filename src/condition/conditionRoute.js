import { INTEGER } from "sequelize";
import Condition from "./conditionModel.js";

export async function createCondition(condition){
    try {
        const newCondition = await Condition.create({
            activeCondition: condition.activeCondition,
            scaleCondition : condition.scaleCondition,
            AoE : Math.floor(Math.random() * 10) + 1,
            isFlat : condition.isFlat,
            activeValue : condition.activeValue
        });
        console.log(`User ${condition.conditionId} has created the condition ${condition.conditionType}.`);
        return newCondition;
    } catch(error) {
        console.error("Erreur lors de la création de l\'effet :\n", error);
        return ;
    }
}

export async function findConditionById(conditionId){
    try{
        return await Condition.findByPk(conditionId);
    } catch (error){
        console.error(`Erreur lors de la recherche d'effet [Condition Id = ${conditionId}] :`, error);
    }
}