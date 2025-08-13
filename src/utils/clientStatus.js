const { db } = require("./firebase");
const log = require("../logger");

const updateStatus = async client => {
  if (!client) return;
  const ref = db.collection("Bot").doc("Config");
  const doc = await ref.get();
  if (!doc.exists) await ref.set({ status: { members: 0, servers: 0 } }, { merge: true });

  const members = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
  const servers = client.guilds.cache.size;

  await ref.set({ status: { members, servers } }, { merge: true })
    .catch(e => log.error("Failed to update status: " + e));
  log.info(`Status updated: ${members} members / ${servers} servers`);
};

module.exports = { updateStatus };
