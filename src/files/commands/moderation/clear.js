const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType
} = require("discord.js");

const TIMEFRAMES = {
  "1h": { label: "1 hour", ms: 1 * 60 * 60 * 1000 },
  "6h": { label: "6 hours", ms: 6 * 60 * 60 * 1000 },
  "12h": { label: "12 hours", ms: 12 * 60 * 60 * 1000 },
  "1d": { label: "1 day", ms: 24 * 60 * 60 * 1000 },
  "7d": { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  "14d": { label: "14 days", ms: 14 * 24 * 60 * 60 * 1000 },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete messages from a channel with filters and confirmation")
    .addIntegerOption(opt =>
      opt.setName("amount")
        .setDescription("Number of messages to delete (1–100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true))
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("Delete messages only from this user")
        .setRequired(false))
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription("Target channel (optional)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false))
    .addStringOption(opt =>
      opt.setName("timeframe")
        .setDescription("Timeframe to filter messages")
        .setRequired(false)
        .addChoices(
          { name: "1 hour", value: "1h" },
          { name: "6 hours", value: "6h" },
          { name: "12 hours", value: "12h" },
          { name: "1 day", value: "1d" },
          { name: "7 days", value: "7d" },
          { name: "14 days", value: "14d" }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const pub = module.exports.config;
    const amount = interaction.options.getInteger("amount");
    const user = interaction.options.getUser("user");
    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;
    const timeframeKey = interaction.options.getString("timeframe");
    const timeframe = TIMEFRAMES[timeframeKey]?.ms || null;

    if (!targetChannel.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(pub.embedColorError)
            .setTitle("Permission Denied")
            .setDescription("**You lack permission to delete messages in the selected channel.**")
        ],
        flags: 64
      });
    }

    const fields = [
      { name: "Channel", value: `${targetChannel}`, inline: true },
      { name: "Amount", value: `**${amount}** messages`, inline: true }
    ];

    if (user) fields.push({ name: "User Filter", value: `**${user.tag}**`, inline: true });
    if (timeframeKey) fields.push({ name: "Timeframe", value: `**${TIMEFRAMES[timeframeKey].label}**`, inline: true });

    const confirmEmbed = new EmbedBuilder()
      .setColor(pub.embedColor)
      .setTitle("🗑️ Confirm Deletion")
      .setDescription("Please confirm the following clear operation:")
      .addFields(fields)
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("clear_confirm")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:Discord_Trash:1402095695086882816>"),
      new ButtonBuilder()
        .setCustomId("clear_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:Discord_Cross_Red:1402096365806288896>")
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [buttons], flags: 64 });

    const filter = i => i.user.id === interaction.user.id && ["clear_confirm", "clear_cancel"].includes(i.customId);
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, componentType: ComponentType.Button });

    collector.on("collect", async i => {
      if (i.customId === "clear_cancel") {
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor(pub.embedColorError)
              .setTitle("Clear Cancelled")
              .setDescription("The clear command was cancelled.")
          ],
          components: []
        });
        collector.stop();
        return;
      }

      if (i.customId === "clear_confirm") {
        await i.deferUpdate();

        let fetched = await targetChannel.messages.fetch({ limit: 100 });
        if (user) fetched = fetched.filter(m => m.author.id === user.id);
        if (timeframe) {
          const now = Date.now();
          fetched = fetched.filter(m => (now - m.createdTimestamp) <= timeframe);
        }
        const toDelete = fetched.first(amount);

        if (!toDelete.length) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(pub.embedColorError)
                .setTitle("No Messages Found")
                .setDescription("No messages matching your criteria were found.")
            ],
            components: []
          });
          collector.stop();
          return;
        }

        const deleted = await targetChannel.bulkDelete(toDelete, true).catch(() => null);

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(deleted ? pub.embedColor : pub.embedColorError)
              .setTitle(deleted ? "Messages Deleted" : "Deletion Failed")
              .setDescription(deleted
                ? `Deleted **${deleted.size}** messages in ${targetChannel}.`
                : "Messages older than 14 days cannot be deleted.")
          ],
          components: []
        });
        collector.stop();
      }
    });

    collector.on("end", async collected => {
      if (collected.size === 0) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(pub.embedColorError)
              .setTitle("Timeout")
              .setDescription("No response received. Clear command cancelled.")
          ],
          components: []
        });
      }
    });
  }
};
