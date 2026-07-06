import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './index'

export async function uploadFileToStorage(
  file: File,
  path: string,
): Promise<string> {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
