const { ClusterManager } = require("discord-hybrid-sharding");
const { private: priv } = require("../config");
const logger = require("./utils/logger");
logger.clear();

const manager = new ClusterManager("./src/bot.js", {
  token: priv.botToken,
  totalShards: "auto",
  shardsPerClusters: 2,
  totalClusters: "auto",
  mode: "process",
});

manager
  .on("error", (error) => logger.error(`Manager error: ${error}`))
  .on("clusterError", (error) => logger.error(`Cluster error: ${error}`))
  .on("clusterCreate", (cluster) => logger.success(`Cluster launched: ${cluster.id}`))
  .on("clusterDestroy", (cluster) => logger.error(`Cluster destroyed: ${cluster.id}`));

manager.spawn();
