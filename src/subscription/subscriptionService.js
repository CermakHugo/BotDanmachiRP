import User from '../../database/user.js';

// Active ou met à jour l'abonnement premium d'un utilisateur
export async function activateSubscription(discordId, subscriptionId) {
  return await User.upsert({
    discordId,
    premium: true,
    subscriptionId
  });
}

// Vérifie si un utilisateur est premium
export async function isPremium(discordId) {
  const user = await User.findOne({ where: { discordId } });
  return user && user.premium;
}
