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
  firstName?: string
  lastName?: string
  displayName?: string
  usernameInfo?: UsernameInfo
  userUuid: MUUID
  homepage?: string
  createdAt: Date
  updatedAt: Date
}

export interface UsernameTupple {
  userUuid: MUUID
  username: string
}

export interface UpdateProfileGQLInput {
  username?: string
  displayName?: string
  userUuid: MUUID
}
