// src/utils/stringUtils.js

/**
 * Tronque le texte à la limite spécifiée en veillant à terminer sur une phrase complète.
 * @param {string} text Le texte à tronquer.
 * @param {number} limit La longueur maximale souhaitée.
 * @returns {string} Le texte tronqué proprement.
 */
export function trimToSentence(text, limit) {
    if (text.length <= limit) return text;
    let trimmed = text.substring(0, limit);
    const lastPeriod = trimmed.lastIndexOf(".");
    const lastExclamation = trimmed.lastIndexOf("!");
    const lastQuestion = trimmed.lastIndexOf("?");
    const lastPunctuation = Math.max(lastPeriod, lastExclamation, lastQuestion);
    if (lastPunctuation !== -1) {
      return trimmed.substring(0, lastPunctuation + 1);
    }
    return trimmed;
  }
  