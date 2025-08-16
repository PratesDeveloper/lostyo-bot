const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const { private: priv } = require("../config");
const log = require("./services/logger");
const clientLib = require("./services/clientLib");

const clientOptions = {
  allowedMentions: { parse: ["users", "roles", "everyone"], repliedUser: false },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel, Partials.User, Partials.GuildMember],
};

if (priv.useShards) {
  clientOptions.shards = getInfo().SHARD_LIST;
  clientOptions.shardCount = getInfo().TOTAL_SHARDS;
}

const client = new Client(clientOptions);
client.cluster = new ClusterClient(client);

(async () => {
  await log.initSession(); 
  await clientLib.initialize();
})();

client.once("ready", async () => {
  log.setClient(client);
  
  // Initialize client library with client instance
  clientLib.setClient(client);
  
  // Start periodic status updates
  setInterval(async () => {
    await clientLib.updateStatus(client);
  }, 300000); // Every 5 minutes
  
  await require("./handlers/eventsHandler")(client);
  await require("./handlers/commandsHandler")(client);
  
  log.success(`Bot ready! Serving ${client.guilds.cache.size} guilds with ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} members`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  log.info('Received SIGINT, shutting down gracefully...');
  
  // Cleanup services
  await clientLib.cleanup();
  clientLib.cache.destroy();
  clientLib.metrics.destroy();
  
  // Destroy client
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.info('Received SIGTERM, shutting down gracefully...');
  
  // Cleanup services
  await clientLib.cleanup();
  clientLib.cache.destroy();
  clientLib.metrics.destroy();
  
  // Destroy client
  client.destroy();
  process.exit(0);
});
client.login(priv.botToken).catch(e => log.error(`Login failed: ${e.message}`));
