// src/services/floor/floorManager.js

/**
 * Gère la logique de monter/descendre d'étage.
 * - "ascend" => floor--
 * - "descend" => floor++
 * On évite de descendre en dessous de 1 (ou de monter en négatif).
 */
export function changeFloor(character, action) {
    if (action === "ascend") {
      if (character.floor > 1) {
        character.floor -= 1;
      }
    } else if (action === "descend") {
      character.floor += 1;
    }
    // "exit" ou "continue" n'affectent pas directement l'étage ici.
  }
  