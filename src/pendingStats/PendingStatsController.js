import * as  PendingStatsService from "./PendingStatsService.js";

export async function createPendingStats(character){
    return await PendingStatsService.createPendingStats(character)
}
