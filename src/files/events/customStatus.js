const { ActivityType } = require("discord.js");

module.exports = {
  name: "ready",
  once: true,
  async execute(_, client, logger) {
    try {
      await client.user.setPresence({
        activities: [{ name: "lostyo.com | /help", type: ActivityType.Watching }],
        status: "online",
      });
      logger.info("Bot is online and status set.");
    } catch (err) {
      logger.error(`Error setting presence: ${err.stack || err.message}`);
    }
  },
};
