import "../../data/modifier.js";
import { generateText } from "../../handlers/aiHandler.js";
import * as MagicEffectService from "../magicEffects/magicEffectService.js"
import * as MagicRoute from "./MagicRoute.js";

export async function createMagic(character){
    const knowledgeLevel = character.knowledgeLevel;
    const effects = await generateEffetcs(knowledgeLevel, new Array());
    const {name, description} = await buildMagicData(effects);
    const manaCost = await getSumManaCost(effects);
    const turnCost = await  getSumTurnCost(effects);
    const magic = {
        name : name,
        description : description,
        manaCost : manaCost,
        turnCost : turnCost,
    }
    return await MagicRoute.createMagic(character, magic, effects);
}

export async function getMagicEffects(magic){
    return magic.getMagicEffects();
}

export async function generateEffetcs(knowledgeLevel, effects){
    if(effects.length == 0){
        const firstEffect = await MagicEffectService.createRandomMagicEffect();
        await effects.push(firstEffect)
        return await generateEffetcs(--knowledgeLevel, effects)
    } else if(knowledgeLevel > 0){
        const effect = await MagicEffectService.createAnotherMagicEffect(effects[0]);
        await effects.push(effect);
        return await generateEffetcs(--knowledgeLevel , effects);
    } else {
        return effects
    }
}

export async function buildMagicData(magicEffects) {
    // On prépare le prompt à partir des descriptions
    const promptParts = magicEffects
        .map(effectKey => `${MagicEffectService.getMagicEffectDescription(effectKey)}\n`)
        .filter(Boolean);

    const prompt = `Génère un nom de sort unique et évocateur, ainsi qu'une description immersive et
    inspirés de l'univers de DanMachi (Dungeon ni Deai wo Motomeru no wa Machigatteiru Darou ka).

    Le sort doit s'intégrer naturellement dans le monde d'Orario :
    - respecter l'esthétique mythologique et héroïque de la série

    La description doit :
    - être rédigée dans un style épique et narratif (comme un grimoire ou une bénédiction divine)
    - décrire clairement les effets du sort tout en les intégrant dans une mise en scène immersive
    - être plutôt courte, environs 1024 characters, ce critère est plus important que les deux précédents

    Le résultat doit donner l'impression que ce sort pourrait exister officiellement dans DanMachi.
    
    Voici les effets de la magie :\n${promptParts.join("\n")}
    
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

export async function getSumManaCost(effects){
    return await effects.reduce((total, effect) => {
        const manaCost = MagicEffectService.getManaCostMagicEffect(effect);
        return total + manaCost;
    }, 0)
}

export async function getSumTurnCost(effects){
    return await effects.reduce((total, effect) => {
        const turnCost = MagicEffectService.getTurnCostMagicEffect(effect);
        return total + turnCost;
    }, 0)
}