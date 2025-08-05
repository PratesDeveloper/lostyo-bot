module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      client.logger?.error
        ? client.logger.error(`Command error: ${error.message}`)
        : console.error(error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "Error executing command.", flags: 64 });
      } else {
        await interaction.reply({ content: "Error executing command.", flags: 64 });
      }
    }
  }
};
