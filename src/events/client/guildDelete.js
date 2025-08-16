const { updateGuilds } = require("../../services/clientLib");

module.exports = {
  name: "guildDelete",
  once: false,
  async execute(guild, client) {
    await updateGuilds(client, "guildDelete", guild);
  }
};
