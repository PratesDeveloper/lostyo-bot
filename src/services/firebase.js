const { initializeApp, cert, getApps } = require("firebase-admin/app");
const admin = require("firebase-admin");
const fb = require("firebase-admin/firestore");
const config = require("../../config");

if (!getApps().length) {
  initializeApp({
    credential: cert(config.private.firebase.adminKey),
  });
}

const db = fb.getFirestore();

module.exports = { db, fb };
