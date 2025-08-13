const { db } = require("./firebase");
const { log } = require("./logger");

const USERS_PATH = "Bot/Users";
const STATS_PATH = "Bot/Stats";

// --- Helpers ---
async function pushArrayField(docRef, field, value) {
  await docRef.set({ [field]: db.FieldValue.arrayUnion(value) }, { merge: true });
}

// --- Registro de execução de comandos ---
async function ExecutedCommand(userId, command, data = {}) {
  try {
    const docRef = db.collection(USERS_PATH).doc(userId);
    await pushArrayField(docRef, "cmdExecuted", {
      command,
      data,
      timestamp: new Date()
    });
    log.success(`Command executed: ${command} by ${userId}`);
  } catch (err) {
    log.error(`Failed to log executed command: ${err}`);
  }
}

// --- Registro de erro em comandos ---
async function ErrorCommand(userId, command, data = {}) {
  try {
    const docRef = db.collection(USERS_PATH).doc(userId);
    await pushArrayField(docRef, "cmdError", {
      command,
      data,
      timestamp: new Date()
    });
    log.warn(`Command error: ${command} by ${userId}`);
  } catch (err) {
    log.error(`Failed to log command error: ${err}`);
  }
}

// --- Atualizar número de servidores ---
async function updateServers(count) {
  try {
    await db.collection(STATS_PATH).doc("servers").set({ count }, { merge: true });
    log.info(`Updated server count: ${count}`);
  } catch (err) {
    log.error(`Failed to update servers: ${err}`);
  }
}

// --- Atualizar número de membros ---
async function updateMembers(count) {
  try {
    await db.collection(STATS_PATH).doc("members").set({ count }, { merge: true });
    log.info(`Updated member count: ${count}`);
  } catch (err) {
    log.error(`Failed to update members: ${err}`);
  }
}

module.exports = {
  ExecutedCommand,
  ErrorCommand,
  updateServers,
  updateMembers
};
