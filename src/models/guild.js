const getGuildSchema = (guild) => ({
  info: {
    id: guild.id,
    joinedAt: new Date().toISOString(),
    memberCount: guild.memberCount,
  },
  settings: {
    prefix: "l.",
    localeType: "default",
    language: guild.preferredLocale || "en-US",
    channels: {
      welcome: null,
      goodbye: null,
      logs: {
        moderation: null,
        messages: null,
        members: null,
      },
    },
    roles: {
      autorole: null,
      moderator: [],
      muted: null,
    },
  },
  statistics: {
    membersJoined: 0,
    membersLeft: 0,
    dailyStats: {
      date: new Date().toISOString().slice(0, 10),
      joins: 0,
      leaves: 0,
      messages: 0,
    },
    commandExecutions: {
      total: 0,
      commands: {},
    },
  },
  features: {
    leveling: {
      enabled: true,
      multiplier: 1,
      channel: null,
      noXpChannels: [],
      levelUpMessage: "Congratulations, {user}! You've advanced to level {level}!",
      rankRoles: {},
    },
    economy: {
      enabled: true,
      currencySymbol: "$",
      dailyAmount: 100,
      initialBalance: 0,
    },
    moderation: {
      warns: {},
    },
  },
  updatedAt: new Date().toISOString(),
});

module.exports = { getGuildSchema };