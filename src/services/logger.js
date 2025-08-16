const C = require("colors");
const { db } = require("./firebase");
const { FieldValue } = require("firebase-admin/firestore");

let client = null;
let session = null;

const initSession = async () => {
  if (session) return session;
  const now = new Date();
  const id = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}-${String(now.getMinutes()).padStart(2,"0")}`;
  session = db.collection("bot").doc("logger").collection(id).doc("data");
  await session.set({ startedAt: now, entries: [] }, { merge:true }).catch(()=>{});
  console.log(C.green(`Log session started: bot/logger/${id}`));
  return session;
};

const setClient = c => { client = c; console.log("Client Ok"); };

const getCaller = () => {
  try {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, s) => s;
    const f = new Error().stack[3]?.getFileName();
    Error.prepareStackTrace = orig;
    return f ? f.split(/[\\/]/).pop() : "unknown";
  } catch { return "unknown"; }
};

const sendFS = async ({ type="general", time, level, message, file }) => {
  if (!session) return; // não inicializado ainda
  await session.set({ entries: FieldValue.arrayUnion({ time, level, message, file }) }, { merge:true }).catch(()=>{});
  if(type !== "general") {
    const typeDoc = session.collection(type).doc("data");
    await typeDoc.set({ entries: FieldValue.arrayUnion({ time, level, message, file }) }, { merge:true }).catch(()=>{});
  }
};

const log = (msg, color=C.gray, level="log") => {
  const d = new Date();
  const time = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} - ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  const caller = getCaller();
  console.log(color(`[${caller}] [${time}] ● `), msg);
  process.nextTick(()=>sendFS({ type: level, time, level, message: msg, file: caller }));
};

const clear = () => { try { console.clear(); process.stdout.write("\x1Bc\x1B[2J\x1B[0f"); } catch {} };

module.exports = {
  initSession,
  setClient,
  clear,
  info: m=>log(m,C.gray,"gray"),
  warn: m=>log(m,C.yellow,"warn"),
  error: m=>log(m,C.red,"error"),
  success: m=>log(m,C.green,"success"),
  debug: m=>log(m,C.cyan,"debug"),
};
