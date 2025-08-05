const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const { private: priv } = require("../config");
const log = require("./utils/logger");

const client = new Client({
  allowedMentions: { parse: ["users", "roles", "everyone"], repliedUser: false },
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel, Partials.User, Partials.GuildMember],
  shards: getInfo().SHARD_LIST,
  shardCount: getInfo().TOTAL_SHARDS,
});

client.cluster = new ClusterClient(client);

client.once("ready", async () => {
  log.setClient(client);
  await require("./handlers/evnts")(client);
  await require("./handlers/cmds")(client);
});


client.login(priv.botToken).catch(e => log.error(`Login failed: ${e.message}`));