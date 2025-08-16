const { updateGuilds } = require("../../services/clientLib");

module.exports = {
  name: "guildCreate",
  once: false,
  async execute(guild, client) {
    await updateGuilds(client, "guildCreate", guild);
  }
};
