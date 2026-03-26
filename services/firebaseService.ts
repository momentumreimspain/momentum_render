import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { auth, db, storage, googleProvider } from '../config/firebase';

export interface VideoProject {
  id?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  userPhoto?: string;
  imageUrl: string;
  /** Varias imágenes de origen (secuencias); la primera coincide con `imageUrl`. */
  imageUrls?: string[];
  videoUrl: string;
  prompt: string;
  resolution: string;
  musicTrack: string;
  tags: string[];
  description?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  thumbnailUrl?: string;
  // Camera configuration
  cameraMovement?: string;
  movementSpeed?: string;
  duration?: string;
  intensity?: number;
}

// Authentication
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Storage
export const uploadFile = async (
  file: Blob,
  path: string
): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const deleteFile = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Firestore - Video Projects
export const saveVideoProject = async (
  project: Omit<VideoProject, 'id'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'videoProjects'), project);
    return docRef.id;
  } catch (error) {
    console.error('Error saving video project:', error);
    throw error;
  }
};

export const updateVideoProject = async (
  projectId: string,
  updates: Partial<VideoProject>
) => {
  try {
    await updateDoc(doc(db, 'videoProjects', projectId), updates);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const getUserProjects = async (userId: string): Promise<VideoProject[]> => {
  try {
    const q = query(
      collection(db, 'videoProjects'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const projects: VideoProject[] = [];

    querySnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data()
      } as VideoProject);
    });

    return projects;
  } catch (error) {
    console.error('Error getting user projects:', error);
    throw error;
  }
};

export const getAllProjects = async (): Promise<VideoProject[]> => {
  try {
    const q = query(
      collection(db, 'videoProjects'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const projects: VideoProject[] = [];

    querySnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data()
      } as VideoProject);
    });

    return projects;
  } catch (error) {
    console.error('Error getting all projects:', error);
    throw error;
  }
};

export const deleteVideoProject = async (projectId: string) => {
  try {
    await deleteDoc(doc(db, 'videoProjects', projectId));
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};
