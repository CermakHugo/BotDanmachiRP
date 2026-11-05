import Magic from "./MagicModel.js"

Magic.afterCreate(async (magic, effects) => {
    try{
        magic.addMagicEffects(effects)
    } catch(error){
        console.error(`Erreur lors de l'ajout des effets pour la magie ${magic.magicId} :\n\n ${error}`);
    }
})

export async function findMagicById(id){
    try {
        const magic = Magic.findByPk(id);
        console.log(`Magic ${magic.name} find`);
        return magic;
    } catch(e){
        console.error(`None magic find with id : ${id} \n\n${e}`);
        return;
    }
}

export async function updateMagic(magic, newMagic){
    try {
        await magic.update(newMagic);
        console.log(`Magic : ${magic.toJSON()} \n\n->`);
        await magic.reload()
        console.log(`\n\nNew Magic : ${magic.toJSON()}`)
        return magic
    } catch(e) {
        console.error(`Echec : Status n'a pas pu être mis à jour pour ${userId} \n${e}`);
        return;
    }
}

export async function saveMagic(magic){
    try{
        await magic.save()
        console.log(`Magic was saved : ${magic.toJSON()}`)
    } catch(e) {
        console.error(`Impossible to save ${magic.toJSON()} \n\n${e}`)
    }
}

export async function createMagic(character, magic, effects){
    try {
        const newMagic = await Magic.create(magic, effects);
        await character.addMagic(newMagic);
        console.log(`Magic : ${magic.name} was succesful created`);
        return newMagic;
    } catch(e){
        console.error(`Error occured when ${magic.name} was created \n\n${e}`);
        return;
    }
    
}

export async function deleteMagic(id){
    try{
        const magic = this.findMagicById(id)
        if(magic){
            await Magic.destroy({where : {magicId : id}});
            console.log(`Magic ${magic.name} was deleted`);
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
