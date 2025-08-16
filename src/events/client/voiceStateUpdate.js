const { Events } = require("discord.js");
const { db, fb } = require("../../services/firebase");
const clientLib = require("../../services/clientLib");
const log = require("../../services/logger");

module.exports = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState, newState, client) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const guildId = member.guild.id;
      const userId = member.user.id;
      const now = Date.now();

      // Track voice session start/end
      if (!oldState.channel && newState.channel) {
        // User joined voice channel
        await handleVoiceJoin(member, newState.channel, now);
      } else if (oldState.channel && !newState.channel) {
        // User left voice channel
        await handleVoiceLeave(member, oldState.channel, now);
      } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        // User moved between channels
        await handleVoiceMove(member, oldState.channel, newState.channel, now);
      }

      // Track mute/unmute, deafen/undeafen
      if (oldState.channel && newState.channel) {
        await handleVoiceStateChange(member, oldState, newState, now);
      }

    } catch (error) {
      log.error("Voice state update error:", error);
      await clientLib.metrics.recordError(error, {
        event: "voiceStateUpdate",
        guildId: oldState.guild?.id || newState.guild?.id,
        userId: (oldState.member || newState.member)?.user.id
      });
    }
  }
};

async function handleVoiceJoin(member, channel, timestamp) {
  try {
    const memberRef = db.collection("guilds").doc(member.guild.id)
      .collection("members").doc(member.user.id);

    // Update member voice statistics
    await memberRef.update({
      "statistics.voiceJoins": fb.FieldValue.increment(1),
      "statistics.lastVoiceJoin": fb.Timestamp.fromMillis(timestamp),
      "statistics.lastActive": fb.Timestamp.fromMillis(timestamp),
      "temp.voice.joinedAt": fb.Timestamp.fromMillis(timestamp),
      "temp.voice.channelId": channel.id,
      "temp.voice.channelName": channel.name,
      updatedAt: fb.Timestamp.fromMillis(timestamp)
    });

    // Update channel activity
    await updateChannelActivity(member.guild.id, channel.id, "join");

    // Award XP for joining voice (if enabled)
    const guildSettings = await clientLib.cache.get(`guild:${member.guild.id}`);
    if (guildSettings?.features?.leveling?.enabled) {
      const voiceXP = Math.floor(Math.random() * 10) + 5; // 5-15 XP
      await memberRef.update({
        xp: fb.FieldValue.increment(voiceXP),
        totalXP: fb.FieldValue.increment(voiceXP)
      });
    }

    log.debug(`Voice join: ${member.user.tag} joined ${channel.name} in ${member.guild.name}`);

  } catch (error) {
    log.error("Voice join handling error:", error);
  }
}

async function handleVoiceLeave(member, channel, timestamp) {
  try {
    const memberRef = db.collection("guilds").doc(member.guild.id)
      .collection("members").doc(member.user.id);

    // Get join time to calculate session duration
    const memberDoc = await memberRef.get();
    const memberData = memberDoc.data();
    const joinTime = memberData?.temp?.voice?.joinedAt;

    let sessionDuration = 0;
    if (joinTime) {
      sessionDuration = Math.floor((timestamp - joinTime.toMillis()) / 1000 / 60); // minutes
    }

    // Update member voice statistics
    const updates = {
      "statistics.voiceTime": fb.FieldValue.increment(sessionDuration),
      "statistics.lastVoiceLeave": fb.Timestamp.fromMillis(timestamp),
      "statistics.lastActive": fb.Timestamp.fromMillis(timestamp),
      "temp.voice": fb.FieldValue.delete(),
      updatedAt: fb.Timestamp.fromMillis(timestamp)
    };

    // Add to voice history
    if (sessionDuration > 0) {
      updates["history.voiceHistory"] = fb.FieldValue.arrayUnion({
        channelId: channel.id,
        channelName: channel.name,
        joinedAt: joinTime,
        leftAt: fb.Timestamp.fromMillis(timestamp),
        duration: sessionDuration
      });

      // Award XP based on time spent (1 XP per minute, max 60 XP per session)
      const voiceXP = Math.min(sessionDuration, 60);
      updates.xp = fb.FieldValue.increment(voiceXP);
      updates.totalXP = fb.FieldValue.increment(voiceXP);
    }

    await memberRef.update(updates);

    // Update channel activity
    await updateChannelActivity(member.guild.id, channel.id, "leave", sessionDuration);

    log.debug(`Voice leave: ${member.user.tag} left ${channel.name} after ${sessionDuration} minutes`);

  } catch (error) {
    log.error("Voice leave handling error:", error);
  }
}

async function handleVoiceMove(member, oldChannel, newChannel, timestamp) {
  try {
    // Handle as leave from old channel and join to new channel
    await handleVoiceLeave(member, oldChannel, timestamp);
    await handleVoiceJoin(member, newChannel, timestamp);

    log.debug(`Voice move: ${member.user.tag} moved from ${oldChannel.name} to ${newChannel.name}`);

  } catch (error) {
    log.error("Voice move handling error:", error);
  }
}

async function handleVoiceStateChange(member, oldState, newState, timestamp) {
  try {
    const changes = [];

    // Check for mute changes
    if (oldState.mute !== newState.mute) {
      changes.push({
        type: "mute",
        from: oldState.mute,
        to: newState.mute,
        timestamp: fb.Timestamp.fromMillis(timestamp)
      });
    }

    // Check for deafen changes
    if (oldState.deaf !== newState.deaf) {
      changes.push({
        type: "deaf",
        from: oldState.deaf,
        to: newState.deaf,
        timestamp: fb.Timestamp.fromMillis(timestamp)
      });
    }

    // Check for self mute changes
    if (oldState.selfMute !== newState.selfMute) {
      changes.push({
        type: "selfMute",
        from: oldState.selfMute,
        to: newState.selfMute,
        timestamp: fb.Timestamp.fromMillis(timestamp)
      });
    }

    // Check for self deafen changes
    if (oldState.selfDeaf !== newState.selfDeaf) {
      changes.push({
        type: "selfDeaf",
        from: oldState.selfDeaf,
        to: newState.selfDeaf,
        timestamp: fb.Timestamp.fromMillis(timestamp)
      });
    }

    if (changes.length > 0) {
      const memberRef = db.collection("guilds").doc(member.guild.id)
        .collection("members").doc(member.user.id);

      await memberRef.update({
        "history.voiceStateChanges": fb.FieldValue.arrayUnion(...changes),
        "statistics.lastActive": fb.Timestamp.fromMillis(timestamp),
        updatedAt: fb.Timestamp.fromMillis(timestamp)
      });
    }

  } catch (error) {
    log.error("Voice state change handling error:", error);
  }
}

async function updateChannelActivity(guildId, channelId, action, duration = 0) {
  try {
    const channelRef = db.collection("guilds").doc(guildId)
      .collection("channels").doc(channelId);

    const updates = {
      [`activity.${action}s`]: fb.FieldValue.increment(1),
      "activity.lastActivity": fb.Timestamp.now(),
      updatedAt: fb.Timestamp.now()
    };

    if (action === "leave" && duration > 0) {
      updates["activity.totalMinutes"] = fb.FieldValue.increment(duration);
    }

    await channelRef.set(updates, { merge: true });

  } catch (error) {
    log.error("Channel activity update error:", error);
  }
}