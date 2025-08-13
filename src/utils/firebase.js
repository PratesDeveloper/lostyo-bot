const { initializeApp, applicationDefault, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const config = require("../../config");

if (!getApps().length) {
  initializeApp({
    credential: cert(config.firebaseAdmin) 
  });
}

const db = getFirestore();

module.exports = { db };
