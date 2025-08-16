const { Events, EmbedBuilder } = require("discord.js");
const { db, fb } = require("../../services/firebase");
const clientLib = require("../../services/clientLib");
const log = require("../../services/logger");

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member, client) {
    try {
      const guild = member.guild;
      
      // Update member status in database (don't delete, mark as inactive)
      await updateMemberStatus(guild.id, member.user.id, "left");

      // Get guild settings
      const guildSettings = await clientLib.cache.get(`guild:${guild.id}`);
      const goodbyeSettings = guildSettings?.features?.goodbye;

      // Send goodbye message
      if (goodbyeSettings?.enabled && goodbyeSettings.channel) {
        await sendGoodbyeMessage(member, goodbyeSettings, client);
      }

      // Update guild statistics
      await updateGuildStats(guild.id, "member_leave");

      // Record metrics
      await clientLib.metrics.recordPerformance("member_leave", Date.now(), {
        guildId: guild.id,
        userId: member.user.id,
        memberCount: guild.memberCount
      });

      log.info(`Member left: ${member.user.tag} from ${guild.name} (${guild.memberCount} members)`);

    } catch (error) {
      log.error(`Member leave error in ${member.guild.name}:`, error);
      await clientLib.metrics.recordError(error, {
        event: "guildMemberRemove",
        guildId: member.guild.id,
        userId: member.user.id
      });
    }
  }
};

async function updateMemberStatus(guildId, userId, status) {
  try {
    const memberRef = db.collection("guilds").doc(guildId)
      .collection("members").doc(userId);

    await memberRef.update({
      active: false,
      leftAt: fb.Timestamp.now(),
      leaveReason: status,
      updatedAt: fb.Timestamp.now()
    });

  } catch (error) {
    log.error("Member status update error:", error);
  }
}

async function sendGoodbyeMessage(member, settings, client) {
  try {
    const channel = await client.channels.fetch(settings.channel).catch(() => null);
    if (!channel) return;

    const message = settings.message
      .replace(/\{user\}/g, member.user.tag)
      .replace(/\{server\}/g, member.guild.name)
      .replace(/\{memberCount\}/g, member.guild.memberCount.toString());

    if (settings.embed?.enabled) {
      const embed = new EmbedBuilder()
        .setColor(settings.embed.color || "#f04747")
        .setTitle(settings.embed.title || "Goodbye!")
        .setDescription(settings.embed.description
          .replace(/\{user\}/g, member.user.tag)
          .replace(/\{server\}/g, member.guild.name)
          .replace(/\{memberCount\}/g, member.guild.memberCount.toString()))
        .setTimestamp();

      if (settings.embed.thumbnail) {
        embed.setThumbnail(member.user.displayAvatarURL());
      }

      await channel.send({ content: message, embeds: [embed] });
    } else {
      await channel.send(message);
    }

  } catch (error) {
    log.error("Goodbye message error:", error);
  }
}

async function updateGuildStats(guildId, action) {
  try {
    const guildRef = db.collection("guilds").doc(guildId);
    const today = new Date().toISOString().slice(0, 10);

    const updates = {
      "statistics.members.left": fb.FieldValue.increment(1),
      "statistics.members.current": fb.FieldValue.increment(-1),
      [`statistics.daily.${today}.leaves`]: fb.FieldValue.increment(1),
      "statistics.lastActivity": fb.Timestamp.now(),
      updatedAt: fb.Timestamp.now()
    };

    await guildRef.update(updates);

  } catch (error) {
    log.error("Guild stats update error:", error);
  }
}