firebase.initializeApp(CONFIG.firebase);
const auth = firebase.auth();
const db = firebase.firestore();

function getUserDocRef(uid) {
  return db.collection('users').doc(uid);
}

function getEntriesRef(uid) {
  return getUserDocRef(uid).collection('entries');
}

function getEntryRef(uid, tmdbId, type) {
  return getEntriesRef(uid).doc(`${tmdbId}_${type}`);
}

async function createUserProfile(uid, { username, email }) {
  await getUserDocRef(uid).set({
    username: username.trim(),
    email: email.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function getUserProfile(uid) {
  const doc = await getUserDocRef(uid).get();
  return doc.exists ? doc.data() : null;
}

async function addEntry(uid, data) {
  const ref = getEntryRef(uid, data.tmdbId, data.type);
  await ref.set({
    ...data,
    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function updateEntry(uid, tmdbId, type, data) {
  const ref = getEntryRef(uid, tmdbId, type);
  await ref.update({
    ...data,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function removeEntry(uid, tmdbId, type) {
  const ref = getEntryRef(uid, tmdbId, type);
  await ref.delete();
}

async function getEntry(uid, tmdbId, type) {
  const ref = getEntryRef(uid, tmdbId, type);
  const doc = await ref.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function getUserEntries(uid) {
  const snapshot = await getEntriesRef(uid).orderBy('updatedAt', 'desc').get();
  const entries = [];
  snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
  return entries;
}

async function getUserEntriesByStatus(uid, status) {
  const snapshot = await getEntriesRef(uid).where('status', '==', status).orderBy('updatedAt', 'desc').get();
  const entries = [];
  snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
  return entries;
}

async function deleteUserData(uid) {
  const entries = await getEntriesRef(uid).get();
  const batch = db.batch();
  entries.forEach((doc) => batch.delete(doc.ref));
  batch.delete(getUserDocRef(uid));
  await batch.commit();
}

export {
  auth,
  db,
  createUserProfile,
  getUserProfile,
  addEntry,
  updateEntry,
  removeEntry,
  getEntry,
  getUserEntries,
  getUserEntriesByStatus,
  deleteUserData,
};
