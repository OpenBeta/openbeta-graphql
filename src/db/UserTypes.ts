import { MUUID } from 'uuid-mongodb'

export interface ExperimentalUserType {
  _id: MUUID
  displayName: string
  nickname: string
  url: string
  createdAt: Date
  updatedAt: Date
}

export interface ExperimentalAuthorType {
  displayName: string
  url: string
}

export interface UsernameInfo {
  username: string
  updatedAt: Date
}
export interface User {
  _id: MUUID
  displayName?: string
  usernameInfo?: UsernameInfo
  website?: string
  bio?: string
  createdAt: Date
  updatedAt: Date
}

export type UpdateProfileGQLInput = Omit<User, '_id' | 'usernameInfo' | 'createdAt' | 'updatedAt'> & {
  username?: string
}

export interface GetUsernameReturn {
  _id: MUUID
  username: string
  updatedAt: Date
}
