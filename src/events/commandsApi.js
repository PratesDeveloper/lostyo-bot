// src/events/commandsApi.js

const { EmbedBuilder } = require("discord.js");
const clientLib = require("../services/clientLib");
const { public: pub } = require("../../config");

const sendCommandError = async (interaction, error) => {
  const embed = new EmbedBuilder()
    .setColor(pub.embed?.errorColor || "#FF0000")
    .setDescription(" <:Discord_Cross_Red:1402096365806288896> Command not found.")
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ embeds: [embed], flags: 64 });
  } else {
    await interaction.reply({ embeds: [embed], flags: 64 });
  }
};

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);

      clientLib.incCmd();
    } catch (error) {
      client.logger?.error
        ? client.logger.error(`Command "${interaction.commandName}" error: ${error.message}`)
        : console.error(error);

      await sendCommandError(interaction, error);
    }
  }
};