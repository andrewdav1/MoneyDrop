// Drops logic
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Function to add a new drop
export const addDrop = async (dropData: Record<string, unknown>): Promise<void> => {
  try {
    const dropsCollection = collection(db, 'drops');
    await addDoc(dropsCollection, dropData);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Function to get all drops
export const getAllDrops = async (): Promise<Array<Record<string, unknown>>> => {
  const dropsCollection = collection(db, 'drops');
  const dropSnapshot = await getDocs(dropsCollection);
  return dropSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>;
};