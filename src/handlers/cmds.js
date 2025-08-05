const fs = require("fs"), path = require("path");
const { REST, Routes } = require("discord.js");
const { private: priv, public: pub } = require("../../config");
const log = require("../utils/logger");

module.exports = async (client) => {
  client.commands = new Map();
  const commands = [];

  const loadCommands = (dir) => {
    try {
      fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) return loadCommands(fullPath);
        if (!file.endsWith(".js")) return;

        try {
          const cmd = require(fullPath);
          if (!cmd.data || !cmd.execute) return log.warn(`Skipping "${file}": Missing data or execute`);
          cmd.config = pub;
          client.commands.set(cmd.data.name, cmd);
          commands.push(cmd.data.toJSON());
          log.debug(`/${cmd.data.name} OK!`);
        } catch (err) {
          log.error(`Failed to load "${file}": ${err.message}`);
        }
      });
    } catch (err) {
      log.error(`Command folder error: ${err.message}`);
    }
  };

  loadCommands(path.join(__dirname, "../files/commands"));

  if (!priv.deploySlashOnReady) return;
  if (!client.user || !client.token) return log.error("Client not ready for slash deploy");

  try {
    const rest = new REST({ version: "10" }).setToken(client.token);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    log.success(`${commands.length} Cmds OK!\n`);
  } catch (err) {
    log.error(`Slash deploy failed: ${err.message}`);
  }
};
