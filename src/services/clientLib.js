const { db, fb } = require("./firebase");
const log = require("./logger");
const { FieldValue } = require("firebase-admin/firestore"); 
const { getGuildSchema } = require("../models/guild"); 
const {  getMemberSchema } = require("../models/member")

const incCmd = async () => {
  try {
    await db.collection("bot").doc("config").update({
      "status.commandsExecuteds": fb.FieldValue.increment(1),
      "status.lastUpdated": fb.Timestamp.now()
    });
  } catch (err) {
    log.error("Failed to update command count:", err);
  }
};

const updateStatus = async client => {
  if (!client) return;
  const ref = db.collection("bot").doc("config");
  const status = { members: client.guilds.cache.reduce((a,g)=>a+g.memberCount,0), servers: client.guilds.cache.size };
  await ref.set({ status }, { merge: true }).catch(e => log.error("Failed to update status: " + e));
  log.info(`Status updated: ${status.members} members / ${status.servers} servers`);
};

const updateGuilds = async (client, action, guild) => {
  if (!action || !guild) return;

  const guildRef = db.collection("guilds").doc(guild.id); 

  try {
    if (action === "guildCreate") {
      const newGuildDocument = getGuildSchema(guild);

      await guildRef.set(newGuildDocument);
      log.info(`Server joined and document created: ${guild.name} (${guild.id})`);
    } else if (action === "guildDelete") {
      await guildRef.update({
        active: false,
        "info.memberCount": guild.memberCount,
        updatedAt: FieldValue.serverTimestamp(),
      });
      log.info(`Server left: ${guild.name} (${guild.id})`);
    }
  } catch (err) {
    log.error(`Failed to update server ${guild.id}: ${err}`);
  }
};

const updateMembers = async (guild, interaction) => {
  if (!guild || !interaction) return;

  const memberRef = db.collection("guilds").doc(guild.id).collection("members").doc(interaction.user.id);

  try {
    const memberData = getMemberSchema(guild, interaction);
    await memberRef.set(memberData);




  } catch (err) {
    log.error(`Failed to update member ${interaction.user.id} in ${guild.id}: ${err}`);
  }
};


module.exports = { incCmd, updateStatus, updateGuilds, updateMembers };
