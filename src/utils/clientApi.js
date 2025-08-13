const { db } = require("./firebase");
const { log } = require("./logger");
let client, oldCache = {};

const setClient = c => {
  client = c;
  log("Client set.");
};

const watchConfig = () => db.collection("Bot").doc("Config").onSnapshot(doc => {
  if (!doc.exists) return log("Config document not found.");
  const cfg = doc.data();
  if (!oldCache.botName || JSON.stringify(oldCache) !== JSON.stringify(cfg)) {
    log("Change detected, applying updates...");
    if (oldCache.botName !== cfg.botName)
      client.user.setUsername(cfg.botName).catch(e => log("Username error: " + e));

    if (oldCache.botAvatar !== cfg.botAvatar)
      client.user.setAvatar(cfg.botAvatar).catch(e => log("Avatar error: " + e));

    if (JSON.stringify(oldCache.botStatus) !== JSON.stringify(cfg.botStatus)) {
      const s = cfg.botStatus?.[0];
      if (s) client.user.setPresence({
        activities: [{ name: s.Description || "No description", type: s.statusType || "PLAYING" }],
        status: "online"
      }).catch(e => log("Status error: " + e));
    }

    oldCache = cfg;
  }
}, e => log("Listener error: " + e));

module.exports = { setClient, watchConfig };
