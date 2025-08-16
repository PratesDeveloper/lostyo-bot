const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const idiome = require("../services/idiome")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Access the dashboard, support, and invite links."),

  async execute(interaction) {
    const pub = module.exports.config;

    const description = await idiome.translate("if you need assistance, use the buttons below to access the dashboard, invite the bot, or join the support server.", interaction);

    const embed = new EmbedBuilder()
      .setColor(pub.embed.color)
      .setTitle("Help & Links")
      .setDescription(description)
      .setFooter({
        text: `/help`,
        iconURL: "https://cdn.discordapp.com/emojis/1402078915580924046.webp?size=32&quality=lossless"
      })

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Dashboard")
        .setStyle(ButtonStyle.Link)
        .setURL(`${pub.baseUrl}/dashboard`)
        .setEmoji("<:Discord_Category:1402058359045226547>"),

      new ButtonBuilder()
        .setLabel("Add Bot")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/oauth2/authorize?client_id=${pub.clientId}&scope=bot+applications.commands&permissions=8`)
        .setEmoji("<:Discord_Bot:1402059166167859382>"),

      new ButtonBuilder()
        .setLabel("Support")
        .setStyle(ButtonStyle.Link)
        .setURL(pub.supportUrl)
        .setEmoji("<:Discord_Support:1402059184630927531>")
    );

    await interaction.reply({ 
      embeds: [embed], 
      components: [row], 
      flags: 64
    });
  }
};
