const { Events } = require("discord.js");
const { private: priv } = require("../../../config");
const clientLib = require("../../services/clientLib");
const log = require("../../services/logger");

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message, client) {
    // Ignore bots and system messages
    if (message.author.bot || message.system) return;
    
    // Ignore DMs
    if (!message.guild) return;

    try {
      // Update member data for XP and statistics
      await clientLib.updateMembers(message.guild, { 
        user: message.author, 
        channel: message.channel,
        commandName: "message"
      }, "message");

      // Check for prefix commands (legacy support)
      const guildSettings = await clientLib.cache.get(`guild:${message.guild.id}`);
      const prefix = guildSettings?.settings?.prefix || priv.defaultPrefix;

      if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Emit event for prefix command handling
        client.emit("prefixCommand", message, commandName, args);
      }

      // Anti-spam and automod checks
      await handleAutoModeration(message, client);

      // Update message statistics
      await updateMessageStats(message.guild.id, message.author.id, message);

    } catch (error) {
      log.error(`Message processing error in ${message.guild.name}:`, error);
      await clientLib.metrics.recordError(error, {
        event: "messageCreate",
        guildId: message.guild.id,
        userId: message.author.id,
        channelId: message.channel.id
      });
    }
  }
};

async function handleAutoModeration(message, client) {
  try {
    // Get guild automod settings
    const guildSettings = await clientLib.cache.get(`guild:${message.guild.id}`);
    const automod = guildSettings?.features?.moderation?.automod;

    if (!automod?.enabled) return;

    let violations = [];

    // Anti-spam check
    if (automod.antiSpam?.enabled) {
      const spamKey = `spam:${message.guild.id}:${message.author.id}`;
      const messages = await clientLib.cache.get(spamKey) || [];
      
      messages.push(Date.now());
      const recentMessages = messages.filter(time => Date.now() - time < automod.antiSpam.timeframe);
      
      await clientLib.cache.set(spamKey, recentMessages, 60);

      if (recentMessages.length > automod.antiSpam.maxMessages) {
        violations.push({
          type: "spam",
          punishment: automod.antiSpam.punishment,
          reason: `Sent ${recentMessages.length} messages in ${automod.antiSpam.timeframe}ms`
        });
      }
    }

    // Anti-invite check
    if (automod.antiInvite?.enabled) {
      const inviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;
      if (inviteRegex.test(message.content)) {
        violations.push({
          type: "invite",
          punishment: automod.antiInvite.punishment,
          reason: "Posted Discord invite link"
        });
      }
    }

    // Bad words check
    if (automod.badWords?.enabled && automod.badWords.words.length > 0) {
      const content = message.content.toLowerCase();
      const foundWords = automod.badWords.words.filter(word => content.includes(word.toLowerCase()));
      
      if (foundWords.length > 0) {
        violations.push({
          type: "badWords",
          punishment: automod.badWords.punishment,
          reason: `Used prohibited words: ${foundWords.join(", ")}`
        });
      }
    }

    // Anti-caps check
    if (automod.antiCaps?.enabled && message.content.length >= automod.antiCaps.minLength) {
      const capsCount = (message.content.match(/[A-Z]/g) || []).length;
      const capsPercentage = (capsCount / message.content.length) * 100;
      
      if (capsPercentage > automod.antiCaps.percentage) {
        violations.push({
          type: "caps",
          punishment: automod.antiCaps.punishment,
          reason: `${capsPercentage.toFixed(1)}% caps (limit: ${automod.antiCaps.percentage}%)`
        });
      }
    }

    // Process violations
    for (const violation of violations) {
      await processViolation(message, violation, client);
    }

  } catch (error) {
    log.error("Automod error:", error);
  }
}

async function processViolation(message, violation, client) {
  try {
    // Delete the message
    await message.delete().catch(() => {});

    // Apply punishment
    switch (violation.punishment) {
      case "warn":
        // Add warning logic here
        break;
      case "mute":
        // Add mute logic here
        break;
      case "kick":
        // Add kick logic here
        break;
      case "ban":
        // Add ban logic here
        break;
    }

    // Log the violation
    log.info(`Automod violation: ${violation.type} by ${message.author.tag} in ${message.guild.name}`);

  } catch (error) {
    log.error("Violation processing error:", error);
  }
}

async function updateMessageStats(guildId, userId, message) {
  try {
    const updates = {
      "statistics.messagesSent": require("firebase-admin/firestore").FieldValue.increment(1),
      "statistics.charactersTyped": require("firebase-admin/firestore").FieldValue.increment(message.content.length),
      "statistics.wordsTyped": require("firebase-admin/firestore").FieldValue.increment(message.content.split(/\s+/).length),
      "statistics.lastActive": require("firebase-admin/firestore").Timestamp.now(),
      updatedAt: require("firebase-admin/firestore").Timestamp.now()
    };

    await require("../../services/firebase").db
      .collection("guilds").doc(guildId)
      .collection("members").doc(userId)
      .update(updates);

  } catch (error) {
    log.error("Message stats update error:", error);
  }
}