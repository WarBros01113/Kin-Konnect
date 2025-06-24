import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';
import { v4 as uuidv4 } from 'uuid';

export const uploadImage = async (userId: string, file: File, pathPrefix: string = 'images'): Promise<string> => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const storageRef = ref(storage, `${userId}/${pathPrefix}/${fileName}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};
