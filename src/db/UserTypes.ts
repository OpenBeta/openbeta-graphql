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
  canonicalName: string
  updatedAt: Date
}
export interface User {
  _id: MUUID
  email?: string
  emailVerified?: boolean
  displayName?: string
  usernameInfo?: UsernameInfo
  website?: string
  bio?: string
  createdAt: Date
  updatedAt: Date
  createdBy: MUUID
  updatedBy?: MUUID
}

type NotUpdatableFields = 'usernameInfo' | 'createdAt' | 'updatedAt' | 'createdBy'

export type UpdateProfileGQLInput = Omit<User, NotUpdatableFields> & {
  username?: string
}

export interface GetUsernameReturn {
  _id: MUUID
  username: string
  updatedAt: Date
}
