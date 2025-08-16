const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const { private: priv } = require("../config");
const log = require("./services/logger");
const lib = require("./services/clientLib")

const clientOptions = {
  allowedMentions: { parse: ["users", "roles", "everyone"], repliedUser: false },
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
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
})();

client.once("ready", async () => {
  log.setClient(client);
  await require("./handlers/eventsHandler")(client);
  await require("./handlers/commandsHandler")(client);
});

client.login(priv.botToken).catch(e => log.error(`Login failed: ${e.message}`));
