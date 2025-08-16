const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const clientLib = require("../../services/clientLib");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("analytics")
    .setDescription("View detailed server analytics and statistics")
    .addStringOption(option =>
      option.setName("timeframe")
        .setDescription("Time period for analytics")
        .setRequired(false)
        .addChoices(
          { name: "Last 24 hours", value: "1d" },
          { name: "Last 7 days", value: "7d" },
          { name: "Last 30 days", value: "30d" },
          { name: "Last 90 days", value: "90d" }
        ))
    .addStringOption(option =>
      option.setName("type")
        .setDescription("Type of analytics to view")
        .setRequired(false)
        .addChoices(
          { name: "Overview", value: "overview" },
          { name: "Commands", value: "commands" },
          { name: "Members", value: "members" },
          { name: "Activity", value: "activity" }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const pub = module.exports.config;
    const timeframe = interaction.options.getString("timeframe") || "7d";
    const type = interaction.options.getString("type") || "overview";

    await interaction.deferReply({ flags: 64 });

    try {
      const analytics = await clientLib.getGuildAnalytics(interaction.guild.id, timeframe);
      const commandStats = await clientLib.metrics.getCommandStats(timeframe);

      const embed = new EmbedBuilder()
        .setColor(pub.embed.color)
        .setTitle(`📊 Server Analytics - ${timeframe.toUpperCase()}`)
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();

      switch (type) {
        case "overview":
          embed.setDescription("**Server Overview Statistics**")
            .addFields(
              { name: "👥 Active Members", value: `**${analytics.activeMembers}**`, inline: true },
              { name: "💬 Total Messages", value: `**${analytics.totalMessages.toLocaleString()}**`, inline: true },
              { name: "⚡ Commands Used", value: `**${analytics.totalCommands.toLocaleString()}**`, inline: true },
              { name: "📈 Level Ups", value: `**${analytics.levelUps}**`, inline: true },
              { name: "🆕 New Members", value: `**${analytics.newMembers}**`, inline: true },
              { name: "📊 Growth Rate", value: `**${((analytics.newMembers / interaction.guild.memberCount) * 100).toFixed(1)}%**`, inline: true }
            );
          break;

        case "commands":
          const topCommands = Object.entries(commandStats.byCommand)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([cmd, count], index) => `**${index + 1}.** \`${cmd}\` - ${count} uses`)
            .join("\n") || "No command data available";

          embed.setDescription("**Command Usage Statistics**")
            .addFields(
              { name: "📊 Total Commands", value: `**${commandStats.total.toLocaleString()}**`, inline: true },
              { name: "📈 Daily Average", value: `**${Math.round(commandStats.total / parseInt(timeframe.replace("d", "")))}**`, inline: true },
              { name: "🏆 Most Popular Commands", value: topCommands, inline: false }
            );
          break;

        case "members":
          const memberGrowth = analytics.newMembers;
          const retentionRate = ((analytics.activeMembers / interaction.guild.memberCount) * 100).toFixed(1);

          embed.setDescription("**Member Statistics**")
            .addFields(
              { name: "👥 Total Members", value: `**${interaction.guild.memberCount}**`, inline: true },
              { name: "✅ Active Members", value: `**${analytics.activeMembers}**`, inline: true },
              { name: "📈 New Joins", value: `**${memberGrowth}**`, inline: true },
              { name: "🎯 Retention Rate", value: `**${retentionRate}%**`, inline: true },
              { name: "💬 Avg Messages/Member", value: `**${Math.round(analytics.totalMessages / analytics.activeMembers) || 0}**`, inline: true },
              { name: "⚡ Avg Commands/Member", value: `**${Math.round(analytics.totalCommands / analytics.activeMembers) || 0}**`, inline: true }
            );
          break;

        case "activity":
          const activityByDay = Object.entries(analytics.activityByDay || {})
            .map(([day, activity]) => `**${day}:** ${activity} activities`)
            .join("\n") || "No activity data available";

          embed.setDescription("**Activity Statistics**")
            .addFields(
              { name: "📊 Daily Activity", value: activityByDay, inline: false },
              { name: "🔥 Peak Activity", value: `**${Math.max(...Object.values(analytics.activityByDay || {}))} activities**`, inline: true },
              { name: "📉 Lowest Activity", value: `**${Math.min(...Object.values(analytics.activityByDay || {}))} activities**`, inline: true }
            );
          break;
      }

      embed.setFooter({
        text: `Analytics for ${interaction.guild.name} • Timeframe: ${timeframe}`,
        iconURL: interaction.client.user.displayAvatarURL()
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      log.error("Analytics command error:", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(pub.embed.errorColor)
        .setTitle("❌ Analytics Error")
        .setDescription("Failed to retrieve analytics data. Please try again later.")
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};