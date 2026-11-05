import * as helpRoute from "./helpRoute.js";

export function getHelpContent(topic) {
  return helpRoute.getHelpTopic(topic);
}

export function getAvailableTopics() {
  return helpRoute.listHelpTopics();
}

export default {
  getHelpContent,
  getAvailableTopics,
};
