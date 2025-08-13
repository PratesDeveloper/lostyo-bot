const C = require("colors");
const { private: priv, embedColor, embedColorError } = require("../../config");
const { EmbedBuilder } = require("discord.js");
const { db } = require("../firebase"); // Firestore

let client = null;
const queue = [];

const colors = {
  gray: embedColor || "#999999",
  yellow: "#ffcc00",
  red: embedColorError || "#ff4444",
  green: "#00cc66",
  cyan: "#3399ff",
};

// Firestore refs dinâmicos
const LOG_COLLECTION = "Bot";
const LOGS_ROOT = "Logs";
let sessionDocRef = null;

// Cria uma sessão nova a cada startup
async function initLogs() {
  try {
    const now = new Date();
    const sessionId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;

    sessionDocRef = db
      .collection(LOG_COLLECTION)
      .doc(LOGS_ROOT)
      .collection(sessionId) // subcoleção da sessão
      .doc("data");

    await sessionDocRef.set({
      startedAt: now,
      entries: [],
    });

    console.log(C.green(`Firestore log session started: ${LOG_COLLECTION}/${LOGS_ROOT}/${sessionId}`));
  } catch (err) {
    console.error("Logger: failed to init Firestore log session", err);
  }
}

const setClient = c => {
  client = c;
  console.log("     Client Ok");
  if (priv.logChannel) {
    queue.splice(0).forEach(sendToChannel);
  } else {
    console.warn("Logger: logChannel not set");
  }
};

const sendToChannel = async ({ time, level, raw }) => {
  if (!client) return queue.push({ time, level, raw });
  if (!priv.logChannel) return;

  try {
    const ch = await client.channels.fetch(priv.logChannel);
    if (!ch?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(colors[level] || embedColor)
      .setDescription(`${raw}`)
      .setTimestamp();

    await ch.send({ embeds: [embed] });
  } catch (err) {
    console.error("Logger: failed to send to channel", err);
  }
};

async function sendToFirestore({ time, level, raw, caller }) {
  try {
    if (!sessionDocRef) await initLogs();
    await sessionDocRef.update({
      entries: db.FieldValue.arrayUnion({
        time,
        level,
        message: raw,
        file: caller,
      }),
    });
  } catch (err) {
    console.error("Logger: failed to write to Firestore", err);
  }
}

function getCallerFile() {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  try {
    const err = new Error();
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = err.stack;
    Error.prepareStackTrace = originalPrepareStackTrace;
    const caller = stack[3];
    if (!caller) return "unknown";
    const fileName = caller.getFileName();
    return fileName ? fileName.split(/[\\/]/).pop() : "unknown";
  } catch {
    return "unknown";
  }
}

const log = async (raw, colorFn, level = "log") => {
  const d = new Date();
  const time = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} - ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  const callerFile = getCallerFile();
  const prefix = `[${callerFile}] [${time}] ● `;

  try {
    console.log(colorFn(prefix), raw);
  } catch {
    console.log(prefix, raw);
  }

  await sendToChannel({ time, level, raw });
  await sendToFirestore({ time, level, raw, caller: callerFile });
};

const clear = () => {
  try {
    console.clear();
    process.stdout.write("\x1Bc\x1B[2J\x1B[0f");
  } catch {}
};

module.exports = {
  setClient,
  clear,
  initLogs,
  info: m => log(m, C.gray, "gray"),
  warn: m => log(m, C.yellow, "yellow"),
  error: m => log(m, C.red, "red"),
  success: m => log(m, C.green, "green"),
  debug: m => log(m, C.cyan, "cyan"),
};
