require("dotenv").config();

const shared = {
  clientId: process.env.CLIENT_ID,
  appName: "Lostyo",
  baseUrl: "https://lostyo.com",
  supportUrl: "https://discord.gg/lostyo",
  developers: [
    { name: "Prates Dev", id: "1186245792353243180" }
  ],
  defaultPrefix: "!",
  embed: {
    color: "#5865f2",
    errorColor: "#f04747",
  },
  assets: {
    iconBot: "./src/assets/img/lostyo_icon.png",
  },
  links: {
    addBotUrl: "https://discord.com/api/oauth2/authorize?client_id=1186245792353243180&permissions=8&scope=bot%20applications.commands",
  }
};

const privateConfig = {
  ...shared,

  // BOT
  botToken: process.env.TOKEN_BOT,
  deploySlashOnReady: true,
  underDevelopment: false,

  // DATABASE
  databaseUrl: process.env.DATABASE_URL,

  // LOGGING
  logChannel: process.env.CHANNEL_ID,
  logWebhook: process.env.WEBHOOK_URL,

  // API
  apiKey: process.env.API_KEY,

  // FIREBASE
  firebase: {
    adminKey: {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
      universe_domain: "googleapis.com"
    }
  }
};

module.exports = {
  public: shared,
  private: privateConfig,
};
