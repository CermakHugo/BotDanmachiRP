export class TurnTable{
    fighters = new Array();
    currentFighter;
    nextFighterTurn;
    fightersPositionList = new Map();
    maxSpeed = 0;
    turnNumber = 0;

    init(allies, ennemies){
        this.fighters.push(...allies);
        this.fighters.push(...ennemies);
        this.fighters = this.fighters.sort((firstFighter , secondFighter) => {
            const speedValueForCharacter1 = firstFighter.getTotalAgility();
            const speedValueForCharacter2 = secondFighter.getTotalAgility();
            return speedValueForCharacter2 - speedValueForCharacter1
        });
        this.fighters.forEach((fighter) => {
            this.fightersPositionList.set(fighter, 0);
        })
        this.maxSpeed = this.fighters[0].getTotalAgility();
        this.defineNextFighter()
    }

    getFighterById(fighterId){
        return this.fighters.find((fighter) => {return  fighter.id === fighterId})
    }

    updateFighterPositionList(){
        this.fightersPositionList.forEach((speedValue, fighter) => {
            const nextFighterSpeedValue = speedValue +  fighter.getTotalAgility();
            this.fightersPositionList.set(fighter, nextFighterSpeedValue);
        })
        this.fightersPositionList = this.sortMapByValues(this.fightersPositionList);
    }

    defineNextFighter(){
        if(this.fighters.length === 0) return;

        const everyoneDead = this.fighters.every((f) => f.isDead);
        if(everyoneDead){
            this.nextFighterTurn = this.fighters[0];
            return;
        }

        const nextFighter = [...this.fightersPositionList.keys()].find((fighter) => {
            if(fighter?._isDead()){
                this.fightersPositionList.set(fighter, 0);
                return false;
            }
            return this.fightersPositionList.get(fighter) >= this.maxSpeed
        });
        if(!nextFighter){
            this.updateFighterPositionList();
            return this.defineNextFighter();
        } else {
            this.nextFighterTurn = nextFighter
            this.fightersPositionList.set(nextFighter, 0);
        }
    }

    nextTurn(){
        this.turnNumber++;
        this.currentFighter = this.nextFighterTurn;
        this.defineNextFighter();
        return this.currentFighter;
    }

    /* 
    Convertit une map en un Vecteur ( EXEMPLE : [[Fighter1, SpeedValue1],[Fighter2, speedValue2]]) 
    Puis on tri en fonction de la speed value des éléments
    Enfin on forme une nouvelle map avec les valeurs triées
    */ 
    sortMapByValues(map){
        return new Map(
            Array.from(map).sort((array1, array2) => array2[1] - array1[1])
        ) 
    }

}
