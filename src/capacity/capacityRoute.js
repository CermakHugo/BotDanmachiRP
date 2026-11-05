import Capacity from "./capacityModel.js"

Capacity.afterCreate(async (capacity, effects) => {
    try{
        capacity.addCapacityEffects(effects)
    } catch(error){
        console.error(`Erreur lors de l'ajout des effets pour la magie ${capacity.capacityId} :\n\n ${error}`);
    }
})

export async function findCapacityById(id){
    try {
        const capacity = Capacity.findByPk(id);
        console.log(`Capacity ${capacity.name} find`);
        return capacity;
    } catch(e){
        console.error(`None capacity find with id : ${id} \n\n${e}`);
        return;
    }
}

export async function updateCapacity(capacity, newCapacity){
    try {
        await capacity.update(newCapacity);
        console.log(`Capacity : ${capacity.toJSON()} \n\n->`);
        await capacity.reload()
        console.log(`\n\nNew Capacity : ${capacity.toJSON()}`)
        return capacity
    } catch(e) {
        console.error(`Echec : Status n'a pas pu être mis à jour pour ${userId} \n${e}`);
        return;
    }
}

export async function saveCapacity(capacity){
    try{
        await capacity.save()
        console.log(`Capacity was saved : ${capacity.toJSON()}`)
    } catch(e) {
        console.error(`Impossible to save ${capacity.toJSON()} \n\n${e}`)
    }
}

export async function createCapacity(character, capacity, effects){
    try {
        const newCapacity = await Capacity.create(capacity, effects);
        await character.addCapacity(newCapacity);
        console.log(`Capacity : ${capacity.name} was succesful created`);
        return newCapacity;
    } catch(e){
        console.error(`Error occured when ${capacity.name} was created \n\n${e}`);
        return;
    }
    
}

export async function deleteCapacity(id){
    try{
        const capacity = this.findCapacityById(id)
        if(capacity){
            await Capacity.destroy({where : {capacityId : id}});
            console.log(`Capacity ${capacity.name} was deleted`);
            return true;
        } else {
            console.log(`Il n'existe pas de personnage associé à l'id ${id}.`)
            return false;
        }
    } catch(e){
        console.error(`Error - Delete the character ${id} fail for reason : \n${e}`);
        return;
    }
}
