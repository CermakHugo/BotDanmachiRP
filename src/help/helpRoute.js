const HELP_TOPICS = {
  general: {
    title: "Guide rapide DanmachiRP",
    description:
      "Serveur RP + systeme JDR. Tu peux jouer sans staff, avec des resolutions automatiques et des combats.",
    fields: [
      {
        name: "Demarrage",
        value:
          "1. /creer_personnage\n2. /rejoindre_familia\n3. /searchgroup\n4. Lance l'expedition avec ton groupe",
      },
      {
        name: "Commandes utiles",
        value:
          "/inventaire, /equiper, /heal, /bestiaire, /help",
      },
      {
        name: "Cycle de jeu type",
        value:
          "Rejoins une familia -> trouve un groupe -> validation -> expedition -> combats/butin -> retour et progression.",
      },
      {
        name: "Aide detaillee",
        value:
          "Utilise /help avec un sujet: exploration, combat, groupe, familia, inventaire.",
      },
    ],
  },
  exploration: {
    title: "Aide - Exploration",
    description:
      "Chaque tour, chaque membre envoie une action. Quand tout le monde a joue, le bot resout le tour.",
    fields: [
      {
        name: "Regles du tour",
        value:
          "1 message = 1 action.\nUn deuxieme message du meme joueur dans le tour est ignore.\nLe bot confirme: action enregistree + membres restants.",
      },
      {
        name: "Actions reconnues",
        value:
          "descendre, monter, fouiller, miner, recolter, sortir.\nLe bot lit les mots-clefs dans vos phrases RP.",
      },
      {
        name: "Resolution",
        value:
          "Priorite: actions sur place (fouille/minage/recolte), puis deplacement.\nLes deplacements identiques ne se cumulent pas (2x descendre = 1 etage).",
      },
      {
        name: "Blocages importants",
        value:
          "Sortie seulement a l'etage 0.\nSi un combat se declenche, exploration bloquee jusqu'a la fin du combat.",
      },
    ],
  },
  combat: {
    title: "Aide - Combat",
    description:
      "Les combats sont tour par tour. Les actions passent par les boutons et modals du combat.",
    fields: [
      {
        name: "Deroulement",
        value:
          "Attaque: choix de cible + description RP.\nFuite: peut reussir ou echouer.\nLe tour alterne automatiquement entre allies et ennemis.",
      },
      {
        name: "Boutons et securite",
        value:
          "Le bouton Suivant est lie au tour courant.\nUn ancien bouton ne peut plus avancer le combat.\nLe spam de clic est bloque.",
      },
      {
        name: "Fin de combat",
        value:
          "Victoire: distribution du butin.\nDefaite totale du groupe: expedition arretee.\nSi un seul allie tombe, le combat continue pour les survivants.",
      },
    ],
  },
  groupe: {
    title: "Aide - Groupe",
    description:
      "Le groupe sert a recruter puis partir en expedition.",
    fields: [
      {
        name: "Creation et recrutement",
        value:
          "/searchgroup pour publier une annonce.\nRejoindre/Inviter/Valider via les boutons.",
      },
      {
        name: "Validation et expedition",
        value:
          "Quand le groupe est valide, expedition lancee et salons expedition generes.",
      },
      {
        name: "Visibilite",
        value:
          "Selon ton reglage, l'annonce peut etre ouverte ou restreinte.",
      },
      {
        name: "Regles utiles",
        value:
          "Un joueur mort ne peut pas rejoindre un groupe.\nSi tous les membres sont KO, expedition terminee.",
      },
    ],
  },
  familia: {
    title: "Aide - Familia",
    description:
      "Les dieux/deesses peuvent accepter ou refuser une demande d'entree.",
    fields: [
      {
        name: "Rejoindre",
        value:
          "/rejoindre_familia puis choix du dieu/deesse.\nChance d'acceptation actuelle: 1 sur 2. (malgré un refus tu peux perserverer)",
      },
      {
        name: "Apres acceptation",
        value:
          "Role familia attribue.\nMessage de bienvenue dans le salon familia.\nChoix de l'arme/armure de depart.",
      },
      {
        name: "Gestion familia",
        value:
          "/familia_info pour consulter les donnees de ta familia.\n/familia_vote pour les elections (si ouvertes).",
      },
    ],
  },
  inventaire: {
    title: "Aide - Inventaire & Equipement",
    description:
      "Ton inventaire contient tes objets. Ton equipement definit ce que tu portes en combat.",
    fields: [
      {
        name: "Commandes",
        value:
          "/inventaire pour afficher tes objets.\n/equiper pour changer ton equipement.",
      },
      {
        name: "Impact combat",
        value:
          "Armes: degats + malus dexterite.\nArmures: resistance + malus agilite.",
      },
      {
        name: "Conseils",
        value:
          "Verifie ton equipement avant expedition.\nUtilise /heal hors expedition (cooldown 1h, impossible si KO).",
      },
    ],
  },
};

export function listHelpTopics() {
  return Object.keys(HELP_TOPICS);
}

export function getHelpTopic(key) {
  const normalized = (key || "general").toString().trim().toLowerCase();
  return HELP_TOPICS[normalized] || HELP_TOPICS.general;
}

export default {
  listHelpTopics,
  getHelpTopic,
};
