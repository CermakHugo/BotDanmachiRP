export async function createPendingStats(character){
    try{
        return await character.createPendingStat()
    } catch(e){
        console.error(e);
        return
    }
}

export async function savePendingStats(pendingStats){
    try{
        return await pendingStats.save()
    } catch(error){
        console.log(`Une erreur est survenu lors de la sauvegarde de PendingStats : ${error}`)
    }
}
