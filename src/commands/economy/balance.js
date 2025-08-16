const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { db } = require("../../services/firebase");
const clientLib = require("../../services/clientLib");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your or another user's balance")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to check balance for")
        .setRequired(false)),

  async execute(interaction) {
    const pub = module.exports.config;
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const isOwnBalance = targetUser.id === interaction.user.id;

    await interaction.deferReply({ flags: isOwnBalance ? 64 : 0 });

    try {
      // Get member data
      const memberRef = db.collection("guilds").doc(interaction.guild.id)
        .collection("members").doc(targetUser.id);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        // Initialize member if doesn't exist
        await clientLib.updateMembers(interaction.guild, { user: targetUser }, "balance_check");
        const newDoc = await memberRef.get();
        memberData = newDoc.data();
      } else {
        memberData = memberDoc.data();
      }

      const balance = memberData.balance || 0;
      const bank = memberData.bank || 0;
      const totalWealth = balance + bank;
      const dailyStreak = memberData.dailyStreak || 0;
      const lastDaily = memberData.lastDaily;

      // Calculate rank
      const allMembers = await db.collection("guilds").doc(interaction.guild.id)
        .collection("members")
        .orderBy("balance", "desc")
        .get();

      let rank = 1;
      allMembers.forEach((doc, index) => {
        if (doc.id === targetUser.id) {
          rank = index + 1;
        }
      });

      const embed = new EmbedBuilder()
        .setColor(pub.embed.color)
        .setTitle(`💰 ${isOwnBalance ? "Your Balance" : `${targetUser.username}'s Balance`}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "💵 Wallet", value: `**${balance.toLocaleString()}** coins`, inline: true },
          { name: "🏦 Bank", value: `**${bank.toLocaleString()}** coins`, inline: true },
          { name: "💎 Net Worth", value: `**${totalWealth.toLocaleString()}** coins`, inline: true },
          { name: "📊 Server Rank", value: `**#${rank}** of ${allMembers.size}`, inline: true },
          { name: "🔥 Daily Streak", value: `**${dailyStreak}** days`, inline: true },
          { name: "⏰ Last Daily", value: lastDaily ? `<t:${Math.floor(lastDaily.toDate().getTime() / 1000)}:R>` : "Never", inline: true }
        )
        .setTimestamp();

      // Add progress bar for next daily
      if (lastDaily) {
        const nextDaily = new Date(lastDaily.toDate().getTime() + 24 * 60 * 60 * 1000);
        const now = new Date();
        const canClaim = now >= nextDaily;
        
        if (canClaim) {
          embed.addFields({
            name: "🎁 Daily Reward",
            value: "✅ **Available!** Use `/daily` to claim",
            inline: false
          });
        } else {
          const timeLeft = nextDaily.getTime() - now.getTime();
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          
          embed.addFields({
            name: "🎁 Daily Reward",
            value: `⏳ Available in **${hours}h ${minutes}m**`,
            inline: false
          });
        }
      }

      // Add wealth tier
      let tier = "🥉 Bronze";
      if (totalWealth >= 1000000) tier = "💎 Diamond";
      else if (totalWealth >= 500000) tier = "🏆 Platinum";
      else if (totalWealth >= 100000) tier = "🥇 Gold";
      else if (totalWealth >= 50000) tier = "🥈 Silver";

      embed.addFields({
        name: "🏅 Wealth Tier",
        value: tier,
        inline: true
      });

      embed.setFooter({
        text: `${interaction.guild.name} Economy`,
        iconURL: interaction.guild.iconURL()
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      log.error("Balance command error:", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(pub.embed.errorColor)
        .setTitle("❌ Error")
        .setDescription("Failed to retrieve balance information. Please try again later.");

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};