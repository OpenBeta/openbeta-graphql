import { MUUID } from 'uuid-mongodb'
import { MediaObject } from './MediaObjectTypes.js'
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
  avatar?: string
  createdAt: Date
  updatedAt: Date
  createdBy: MUUID
  updatedBy?: MUUID
}

export interface UpdateProfileGQLInput {
  username?: string
  userUuid: string
  displayName?: string
  bio?: string
  website?: string
  email?: string
  avatar?: string
}

export interface UsernameGQLInput {
  username: string
}

export interface UserIdGQLInput {
  userUuid: string
}

export interface GetUsernameReturn {
  _id: MUUID
  username: string
  updatedAt: Date
}

export type UserPublicProfile = Pick<User, '_id' | 'displayName' | 'bio' | 'website' | 'avatar'> & {
  username: string
}

export interface UserPublicPage {
  profile: UserPublicProfile
  mediaList: MediaObject[]
}
