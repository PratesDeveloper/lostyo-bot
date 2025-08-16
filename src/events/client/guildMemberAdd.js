const { Events, EmbedBuilder } = require("discord.js");
const { db, fb } = require("../../services/firebase");
const clientLib = require("../../services/clientLib");
const log = require("../../services/logger");

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member, client) {
    try {
      const guild = member.guild;
      
      // Initialize member in database
      await clientLib.updateMembers(guild, { user: member.user }, "member_join");

      // Get guild settings
      const guildSettings = await clientLib.cache.get(`guild:${guild.id}`);
      const welcomeSettings = guildSettings?.features?.welcome;

      // Send welcome message
      if (welcomeSettings?.enabled && welcomeSettings.channel) {
        await sendWelcomeMessage(member, welcomeSettings, client);
      }

      // Send welcome DM
      if (welcomeSettings?.dm?.enabled) {
        await sendWelcomeDM(member, welcomeSettings.dm, guild);
      }

      // Assign autorole
      if (welcomeSettings?.autorole) {
        await assignAutorole(member, welcomeSettings.autorole);
      }

      // Update guild statistics
      await updateGuildStats(guild.id, "member_join");

      // Record metrics
      await clientLib.metrics.recordPerformance("member_join", Date.now(), {
        guildId: guild.id,
        userId: member.user.id,
        memberCount: guild.memberCount
      });

      log.info(`Member joined: ${member.user.tag} in ${guild.name} (${guild.memberCount} members)`);

    } catch (error) {
      log.error(`Member join error in ${member.guild.name}:`, error);
      await clientLib.metrics.recordError(error, {
        event: "guildMemberAdd",
        guildId: member.guild.id,
        userId: member.user.id
      });
    }
  }
};

async function sendWelcomeMessage(member, settings, client) {
  try {
    const channel = await client.channels.fetch(settings.channel).catch(() => null);
    if (!channel) return;

    const message = settings.message
      .replace(/\{user\}/g, `<@${member.user.id}>`)
      .replace(/\{server\}/g, member.guild.name)
      .replace(/\{memberCount\}/g, member.guild.memberCount.toString());

    if (settings.embed?.enabled) {
      const embed = new EmbedBuilder()
        .setColor(settings.embed.color || "#5865f2")
        .setTitle(settings.embed.title || "Welcome!")
        .setDescription(settings.embed.description
          .replace(/\{user\}/g, `<@${member.user.id}>`)
          .replace(/\{server\}/g, member.guild.name)
          .replace(/\{memberCount\}/g, member.guild.memberCount.toString()))
        .setTimestamp();

      if (settings.embed.thumbnail) {
        embed.setThumbnail(member.user.displayAvatarURL());
      }

      if (settings.embed.footer) {
        embed.setFooter({
          text: settings.embed.footer.replace(/\{memberCount\}/g, member.guild.memberCount.toString()),
          iconURL: member.guild.iconURL()
        });
      }

      await channel.send({ content: message, embeds: [embed] });
    } else {
      await channel.send(message);
    }

  } catch (error) {
    log.error("Welcome message error:", error);
  }
}

async function sendWelcomeDM(member, dmSettings, guild) {
  try {
    const message = dmSettings.message
      .replace(/\{user\}/g, member.user.username)
      .replace(/\{server\}/g, guild.name);

    await member.send(message);

  } catch (error) {
    log.debug(`Could not send welcome DM to ${member.user.tag}: ${error.message}`);
  }
}

async function assignAutorole(member, autoroleId) {
  try {
    const role = member.guild.roles.cache.get(autoroleId);
    if (!role) return;

    await member.roles.add(role, "Autorole on join");
    log.debug(`Assigned autorole ${role.name} to ${member.user.tag}`);

  } catch (error) {
    log.error(`Autorole assignment error for ${member.user.tag}:`, error);
  }
}

async function updateGuildStats(guildId, action) {
  try {
    const guildRef = db.collection("guilds").doc(guildId);
    const today = new Date().toISOString().slice(0, 10);

    const updates = {
      "statistics.members.joined": fb.FieldValue.increment(1),
      "statistics.members.current": fb.FieldValue.increment(1),
      [`statistics.daily.${today}.joins`]: fb.FieldValue.increment(1),
      "statistics.lastActivity": fb.Timestamp.now(),
      updatedAt: fb.Timestamp.now()
    };

    await guildRef.update(updates);

  } catch (error) {
    log.error("Guild stats update error:", error);
  }
}