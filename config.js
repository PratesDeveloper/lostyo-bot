require("dotenv").config();

const shared = {
  clientId: process.env.CLIENT_ID,
  embedColor: "#5865f2",
  embedColorError: "#f04747",
  appName: "Lostyo",
  baseUrl: "https://lostyo.com",
  supportUrl: "https://discord.gg/lostyo",
  developers: [{ name: "Prates Dev", id: "1186245792353243180" }],
  defaultPrefix: "!",
  iconBot: "./src/assets/img/lostyo_icon.png",
  addBotUrl: "https://discord.com/api/oauth2/authorize?client_id=1186245792353243180&permissions=8&scope=bot%20applications.commands",
};

const privateConfig = {
  ...shared,
  botToken: process.env.TOKEN_BOT,
  DatabaseUrl: process.env.DATABASE_URL,
  logChannel: process.env.CHANNEL_ID,
  deploySlashOnReady: true,
  underDevelopment: false,
  logWebhook: process.env.WEBHOOK_URL,
  apiKey: process.env.API_KEY,
  firebaseAdmin: "./assets/firebase-admin.json",
};

module.exports = {
  public: shared,
  private: privateConfig,
};
