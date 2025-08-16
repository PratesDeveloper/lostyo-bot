const getMemberSchema = (user) => ({
    userId: user.id,
    xp: 0,
    level: 0,
    balance: 0,
    inventory: [],
    statistics: {
        messagesSent: 0,
        commandsUsed: 0,
    },
    history: {
        commandLog: [],
        interactionLog: [],
        dailyLog: [],
    },
    cooldowns: {
        daily: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

module.exports = { getMemberSchema };