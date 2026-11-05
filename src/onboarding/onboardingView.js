import { EmbedBuilder } from "discord.js";

function formatStep(step) {
  const icon = step.done ? "[OK]" : "[TODO]";
  return `${icon} **${step.label}**\n${step.detail}\n${step.command}`;
}

export function buildOnboardingEmbed({ state, steps, next, completionPercent }) {
  const embed = new EmbedBuilder()
    .setColor(0x2b8a3e)
    .setTitle("Guide de demarrage")
    .setDescription("Suis ce parcours pour entrer rapidement dans le jeu.")
    .addFields(
      {
        name: "Progression",
        value: `**${completionPercent}%** complete`,
        inline: true,
      },
      {
        name: "Etat",
        value: state.isDead
          ? "KO (attends la regeneration avant de repartir)"
          : "Operationnel",
        inline: true,
      },
      {
        name: "Personnage",
        value: state.characterName ? `**${state.characterName}**` : "Aucun",
        inline: true,
      },
      {
        name: "Checklist",
        value: steps.map(formatStep).join("\n\n"),
      },
      {
        name: next.title,
        value: next.instruction,
      }
    )
    .setFooter({ text: "Commande utilisable a tout moment: /commencer" });

  return { embeds: [embed] };
}

export default {
  buildOnboardingEmbed,
};