import { getApps, initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'
import { appConfig } from '@/shared/config/env'

const app =
  getApps().length === 0 ? initializeApp(appConfig.firebase) : getApps()[0]

export const storage = getStorage(app)
