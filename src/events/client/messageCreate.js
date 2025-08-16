const { Events } = require("discord.js");
const { private: priv } = require("../../../config");


module.exports = {
  name: "guildCreate",
  once: false,
  async execute(guild, client) {
    try {
      await updateGuilds(client, "guildCreate", guild);
    } catch (err) {
      log.error(`[guildCreate] Failed in ${guild.name}: ${err}`);
    }
  }
};
