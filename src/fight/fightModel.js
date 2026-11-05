import { TurnTable } from "./tools/turnTable.js";

export class FightModel{
    constructor(id, floorNumber){
        this.id = id;
        this.allies = new Array();
        this.ennemies = new Array();
        this.turnTable = new TurnTable();
        this.floorNumber = floorNumber;
        this.actionPool = new Array();
        this.actionQueue = new Array(); 
        this.loot = new Array();
        this.context = ""
        this.resume = "";
    }
}



