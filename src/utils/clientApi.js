const { db } = require("./firebase");
const log = require("./logger");
let client, cache = {};

const setClient = c => { 
  client = c; 
  log.info("Client set."); 
};

// Função para garantir que o documento exista com dados atuais do bot
const ensureConfigDoc = async () => {
  const docRef = db.collection("bot").doc("config");
  const doc = await docRef.get();

  if (!doc.exists) {
    if (!client) throw new Error("Client not set. Cannot initialize config with current bot data.");

    const currentConfig = {
      botName: client.user.username,
      botAvatar: client.user.displayAvatarURL({ dynamic: true }),
      botStatus: client.presence?.activities?.map(a => ({
        statusType: a.type || "PLAYING",
        Description: a.name || "No description"
      })) || [{ statusType: "PLAYING", Description: "Online" }],
      botSupport: ["discord.gg/lostyo"]
    };

    await docRef.set(currentConfig);
    log.info("Config document created with current bot data.");
    return currentConfig;
  }

  return doc.data();
};

const watchConfig = async () => {
  const initialCfg = await ensureConfigDoc();
  cache = initialCfg;

  db.collection("bot").doc("config").onSnapshot(doc => {
    if (!doc.exists) return log.warn("Config document unexpectedly missing.");
    const cfg = doc.data();

    if (JSON.stringify(cache) !== JSON.stringify(cfg)) {
      log.info("Change detected, applying updates...");

      if (cache.botName !== cfg.botName)
        client.user.setUsername(cfg.botName).catch(e => log.error("Username error: " + e));

      if (cache.botAvatar !== cfg.botAvatar)
        client.user.setAvatar(cfg.botAvatar).catch(e => log.error("Avatar error: " + e));

      if (JSON.stringify(cache.botStatus) !== JSON.stringify(cfg.botStatus)) {
        const s = cfg.botStatus?.[0];
        if (s)
          client.user.setPresence({
            activities: [{ name: s.Description || "No description", type: s.statusType || "PLAYING" }],
            status: "online"
          }).catch(e => log.error("Status error: " + e));
      }

      cache = cfg;
    }
  }, e => log.error("Listener error: " + e));
};

module.exports = { setClient, watchConfig };
