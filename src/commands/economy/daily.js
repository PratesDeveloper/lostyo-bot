const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { db, fb } = require("../../services/firebase");
const clientLib = require("../../services/clientLib");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward"),

  async execute(interaction) {
    const pub = module.exports.config;
    
    await interaction.deferReply({ flags: 64 });

    try {
      const memberRef = db.collection("guilds").doc(interaction.guild.id)
        .collection("members").doc(interaction.user.id);
      
      const memberDoc = await memberRef.get();
      let memberData;

      if (!memberDoc.exists) {
        // Initialize member
        await clientLib.updateMembers(interaction.guild, interaction, "daily_claim");
        const newDoc = await memberRef.get();
        memberData = newDoc.data();
      } else {
        memberData = memberDoc.data();
      }

      const lastDaily = memberData.lastDaily;
      const dailyStreak = memberData.dailyStreak || 0;
      const now = new Date();

      // Check if user can claim daily
      if (lastDaily) {
        const nextDaily = new Date(lastDaily.toDate().getTime() + 24 * 60 * 60 * 1000);
        
        if (now < nextDaily) {
          const timeLeft = nextDaily.getTime() - now.getTime();
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          
          const embed = new EmbedBuilder()
            .setColor(pub.embed.errorColor)
            .setTitle("⏰ Daily Already Claimed")
            .setDescription(`You can claim your next daily reward in **${hours}h ${minutes}m**`)
            .addFields({
              name: "🔥 Current Streak",
              value: `**${dailyStreak}** days`,
              inline: true
            })
            .setTimestamp();

          return await interaction.editReply({ embeds: [embed] });
        }
      }

      // Calculate streak
      let newStreak = 1;
      if (lastDaily) {
        const daysSinceLastDaily = Math.floor((now - lastDaily.toDate()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastDaily === 1) {
          newStreak = dailyStreak + 1;
        } else if (daysSinceLastDaily > 1) {
          newStreak = 1; // Reset streak
        }
      }

      // Calculate reward based on streak
      const baseReward = Math.floor(Math.random() * 101) + 50; // 50-150 coins
      const streakBonus = Math.min(newStreak * 10, 200); // Max 200 bonus
      const totalReward = baseReward + streakBonus;

      // Special streak rewards
      let bonusItems = [];
      if (newStreak % 7 === 0) { // Weekly bonus
        bonusItems.push("weekly_chest");
      }
      if (newStreak % 30 === 0) { // Monthly bonus
        bonusItems.push("monthly_trophy");
      }
      if (newStreak === 100) { // Milestone
        bonusItems.push("century_badge");
      }

      // Update member data
      const updates = {
        balance: fb.FieldValue.increment(totalReward),
        lastDaily: fb.Timestamp.now(),
        dailyStreak: newStreak,
        totalEarned: fb.FieldValue.increment(totalReward),
        "history.transactions": fb.FieldValue.arrayUnion({
          type: "daily",
          amount: totalReward,
          timestamp: fb.Timestamp.now(),
          streak: newStreak
        }),
        updatedAt: fb.Timestamp.now()
      };

      if (bonusItems.length > 0) {
        updates.inventory = fb.FieldValue.arrayUnion(...bonusItems);
      }

      await memberRef.update(updates);

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor(pub.embed.color)
        .setTitle("🎁 Daily Reward Claimed!")
        .setDescription(`You received **${totalReward}** coins!`)
        .addFields(
          { name: "💰 Base Reward", value: `${baseReward} coins`, inline: true },
          { name: "🔥 Streak Bonus", value: `${streakBonus} coins`, inline: true },
          { name: "📊 New Streak", value: `**${newStreak}** days`, inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      // Add bonus items if any
      if (bonusItems.length > 0) {
        embed.addFields({
          name: "🎉 Bonus Items",
          value: bonusItems.map(item => `• ${item.replace(/_/g, " ").toUpperCase()}`).join("\n"),
          inline: false
        });
      }

      // Add streak milestones
      const nextMilestone = newStreak < 7 ? 7 : newStreak < 30 ? 30 : newStreak < 100 ? 100 : null;
      if (nextMilestone) {
        embed.addFields({
          name: "🎯 Next Milestone",
          value: `${nextMilestone - newStreak} days until **${nextMilestone}-day streak bonus**`,
          inline: false
        });
      }

      embed.setFooter({
        text: `Come back tomorrow to continue your streak!`,
        iconURL: interaction.client.user.displayAvatarURL()
      });

      await interaction.editReply({ embeds: [embed] });

      // Record metrics
      await clientLib.metrics.recordPerformance("daily_claim", Date.now() - now.getTime(), {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        reward: totalReward,
        streak: newStreak
      });

    } catch (error) {
      log.error("Daily command error:", error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(pub.embed.errorColor)
        .setTitle("❌ Error")
        .setDescription("Failed to claim daily reward. Please try again later.");

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};