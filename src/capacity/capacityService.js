import "../../data/modifier.js";
import { generateText } from "../../handlers/aiHandler.js";
import * as CapacityEffectService from "../capacityEffects/capacityEffectService.js"
import * as CapacityRoute from "./capacityRoute.js";

export async function createCapacity(character){
    const effects = await generateEffetcs(1, new Array());
    const {name, description} = await buildCapacityData(effects);
    const capacity = {
        name : name,
        description : description,
    }
    return await CapacityRoute.createCapacity(character, capacity, effects);
}

export async function getCapacityEffects(capacity){
    return capacity.getCapacityEffects();
}

export async function generateEffetcs(powerLevel, effects){
    const randomNumber = Math.random();
    if(effects.length == 0){
        const firstEffect = await CapacityEffectService.createRandomCapacityEffect();
        await effects.push(firstEffect)
        return await generateEffetcs(2*powerLevel, effects)
    } else if(randomNumber > (powerLevel - 1)/powerLevel){
        const effect = await CapacityEffectService.createAnotherCapacityEffect(effects[0]);
        await effects.push(effect);
        return await generateEffetcs(2*powerLevel , effects);
    } else {
        return effects
    }
}

export async function buildCapacityData(capacityEffects) {
    // On prépare le prompt à partir des descriptions
    const promptParts = capacityEffects
        .map(async effectKey => `${await CapacityEffectService.getCapacityEffectDescription(effectKey)}\n`)
        .filter(Boolean);

    const prompt = `Génère un nom de capacité unique et évocateur, ainsi qu'une description immersive et
    inspirés de l'univers de DanMachi (Dungeon ni Deai wo Motomeru no wa Machigatteiru Darou ka).

    Le sort doit s'intégrer naturellement dans le monde d'Orario :
    - respecter l'esthétique mythologique et héroïque de la série

    La description doit :
    - être rédigée dans un style épique et narratif 
    - décrire clairement les effets de la capacité tout en les intégrant dans une mise en scène immersive
    - être plutôt courte, avec 1024 characters MAXIMUM, ce critère est plus important que les deux précédents
    - être succinct
    - correspondre à la description des effets et de leur condition.

    Tu ne dois absolument ne PAS FAIRE :
    - Ajouter ou retirer des effets dans la liste fournis
    - Parler de méchanique propre au jeu comme les terme tour, point de vie, point de mana, ect. 

    Le résultat doit donner l'impression que cette capacité pourrait exister officiellement dans DanMachi.
    
    Voici les effets de la capacité :\n${promptParts.join("\n")}
    
    La réponse doit avoir la forme suivante : 
    
    Nom : Le nom en question
    Description : La description en question`;

    // On utilise le handler pour générer le texte
    const aiText = await generateText(prompt);

    // Convention : première ligne = nom, reste = description
    const [firstLine, ...descLines] = aiText.split("\n");
    const name = firstLine.replace(/^Nom ?: ?/i, "").trim();
    const description = descLines.join("\n").replace(/^Description ?: ?/i, "").trim();

    return { name, description };
}

export async function getMapEffectCondition(effectsModel){
    const map = new Map();
    effectsModel.forEach(async (effectModel) => {
        const condition = await effectModel.getCondition();
        const effect =  await CapacityEffectService.getCapacityEffect(effectModel);
        map.set(effect, condition)
    })
    return map
}