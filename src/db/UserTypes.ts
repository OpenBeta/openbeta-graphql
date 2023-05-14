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
  displayName?: string
  usernameInfo?: UsernameInfo
  userUuid: MUUID
  homepage?: string
  bio?: string
  createdAt: Date
  updatedAt: Date
}

export type UpdateProfileGQLInput = Omit<User, 'userUuid' | 'usernameInfo' | 'createdAt' | 'updatedAt'> & {
  username?: string
}

export interface GetUsernameReturn {
  username: string
  userUuid: MUUID
  updatedAt: Date
}
