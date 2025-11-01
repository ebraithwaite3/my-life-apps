// services/firestoreService.js
import { 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';

// Global database instance
let dbInstance = null;

/**
 * Sets the global database instance
 */
export const setGlobalDb = (db) => {
  dbInstance = db;
  console.log('✅ Global database instance set');
};

/**
 * Gets the current database instance
 */
const getDb = () => {
  if (!dbInstance) {
    throw new Error('Database instance not available. Call setGlobalDb(db) first.');
  }
  return dbInstance;
};

// ===== BASIC CRUD OPERATIONS =====

/**
 * Get a document by ID
 */
export const getDocument = async (collectionName, documentId) => {
  try {
    // Validate inputs
    if (!collectionName || typeof collectionName !== 'string') {
      throw new Error(`Invalid collectionName: expected string, got ${typeof collectionName}. Value: ${JSON.stringify(collectionName)}`);
    }
    if (!documentId || typeof documentId !== 'string') {
      throw new Error(`Invalid documentId: expected string, got ${typeof documentId}. Value: ${JSON.stringify(documentId)}`);
    }

    const db = getDb();
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error(`Error getting document ${documentId} from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Create a document
 */
export const createDocument = async (collectionName, documentId, data) => {
  try {
    const db = getDb();
    const docRef = doc(db, collectionName, documentId);
    await setDoc(docRef, data);
    return data;
  } catch (error) {
    console.error(`Error creating document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update a document (partial update)
 */
export const updateDocument = async (collectionName, documentId, updateData) => {
  try {
    const db = getDb();
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, updateData);
    return updateData;
  } catch (error) {
    console.error(`Error updating document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (collectionName, documentId) => {
  try {
    const db = getDb();
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting document ${documentId} from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Set/replace a document completely
 */
export const setDocument = async (collectionName, documentId, data) => {
  try {
    const db = getDb();
    const docRef = doc(db, collectionName, documentId);
    await setDoc(docRef, data, { merge: false });
    return data;
  } catch (error) {
    console.error(`Error setting document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};

// ===== QUERY OPERATIONS =====

/**
 * Query documents with a simple where clause
 */
export const queryDocuments = async (collectionName, field, operator, value) => {
  try {
    const db = getDb();
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, where(field, operator, value));
    const querySnapshot = await getDocs(q);
    
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return documents;
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get multiple documents by IDs
 */
export const getDocuments = async (collectionName, documentIds) => {
  try {
    const documents = [];
    
    // Process in batches to avoid overwhelming Firestore
    const batchSize = 10;
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => getDocument(collectionName, id));
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach((doc, index) => {
        if (doc) {
          documents.push({ id: batch[index], ...doc });
        }
      });
    }
    
    return documents;
  } catch (error) {
    console.error(`Error getting multiple documents from ${collectionName}:`, error);
    throw error;
  }
};

/**
  * Get documents by a specific field value
 */
export const getDocumentsByField = async (collectionName, field, value) => {
  try {
    const db = getDb();
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, where(field, '==', value));
    const querySnapshot = await getDocs(q);
    
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return documents;
  } catch (error) {
    console.error(`Error getting documents by field from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Query documents with multiple conditions
 */
export const queryDocumentsAdvanced = async (collectionName, conditions = [], orderByField = null, orderDirection = 'asc', limitCount = null) => {
  try {
    const db = getDb();
    const collectionRef = collection(db, collectionName);
    
    let q = collectionRef;
    
    // Add where conditions
    conditions.forEach(({ field, operator, value }) => {
      q = query(q, where(field, operator, value));
    });
    
    // Add ordering
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection));
    }
    
    // Add limit
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return documents;
  } catch (error) {
    console.error(`Error querying ${collectionName} with advanced conditions:`, error);
    throw error;
  }
};

// ===== REAL-TIME LISTENERS =====

/**
 * Subscribe to a document with real-time updates
 */
export const subscribeToDocument = (collectionName, documentId, callback, errorCallback = null) => {
  try {
    const db = getDb();
    const docRef = doc(db, collectionName, documentId);
    
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error listening to document ${documentId} in ${collectionName}:`, error);
      if (errorCallback) errorCallback(error);
    });
  } catch (error) {
    console.error(`Error setting up listener for ${documentId}:`, error);
    throw error;
  }
};

/**
 * Subscribe to a query with real-time updates
 */
export const subscribeToQuery = (collectionName, conditions = [], callback, errorCallback = null) => {
  try {
    const db = getDb();
    const collectionRef = collection(db, collectionName);
    
    let q = collectionRef;
    conditions.forEach(({ field, operator, value }) => {
      q = query(q, where(field, operator, value));
    });
    
    return onSnapshot(q, (snapshot) => {
      const documents = [];
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      callback(documents);
    }, (error) => {
      console.error(`Error listening to query in ${collectionName}:`, error);
      if (errorCallback) errorCallback(error);
    });
  } catch (error) {
    console.error(`Error setting up query listener for ${collectionName}:`, error);
    throw error;
  }
};

// ===== BATCH OPERATIONS =====

/**
 * Update multiple documents in a single operation
 */
export const updateDocuments = async (updates) => {
  try {
    const promises = updates.map(({ collectionName, documentId, data }) =>
      updateDocument(collectionName, documentId, data)
    );
    
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error updating multiple documents:', error);
    throw error;
  }
};

/**
 * Legacy function for backward compatibility
 */
export const updateUserDoc = async (db, userId, updateData) => {
  console.warn('updateUserDoc is deprecated. Use updateDocument instead.');
  return updateDocument('users', userId, updateData);
};