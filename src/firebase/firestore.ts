import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';

export async function getDocument(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getDocuments(collectionName: string, constraints: QueryConstraint[] = []) {
  const q = query(collection(db, collectionName), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function createDocument(collectionName: string, data: DocumentData) {
  const docRef = await addDoc(collection(db, collectionName), data);
  return docRef.id;
}

export async function setDocument(collectionName: string, docId: string, data: DocumentData) {
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, data);
  return docId;
}

export async function updateDocument(collectionName: string, docId: string, data: Partial<DocumentData>) {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

export async function deleteDocument(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

export function subscribeToCollection(
  collectionName: string,
  callback: (documents: { id: string; [key: string]: unknown }[]) => void,
  constraints: QueryConstraint[] = []
) {
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const documents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(documents);
  });
}

export { collection, doc, query, where, orderBy, limit, onSnapshot };
