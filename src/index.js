const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { ClusterManager } = require("discord-hybrid-sharding");
const { private: priv } = require("../config");
const logger = require("./services/logger");

logger.clear();

if (priv.clustersMode) {
  const manager = new ClusterManager("./src/bot.js", {
    token: priv.botToken,
    totalShards: "auto",
    shardsPerClusters: 2,
    totalClusters: "auto",
    mode: "process",
  });

  manager
    .on("error", e => logger.error(`Manager error: ${e}`))
    .on("clusterError", e => logger.error(`Cluster error: ${e}`))
    .on("clusterCreate", c => logger.success(`Cluster launched: ${c.id}`))
    .on("clusterDestroy", c => logger.error(`Cluster destroyed: ${c.id}`));

  manager.spawn();
} else {
  const client = new Client({
    allowedMentions: { parse: ["users", "roles", "everyone"], repliedUser: false },
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
    partials: [Partials.Channel, Partials.User, Partials.GuildMember],
  });

  (async () => {
    logger.success("Bot started in normal mode");
    await client.login(priv.botToken);
  })();
}
