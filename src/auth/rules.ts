import { inputRule, rule } from 'graphql-shield'

import MediaDataSource from '../model/MutableMediaDataSource.js'
import { MediaObjectGQLInput } from '../db/MediaObjectTypes.js'

export const isEditor = rule()(async (parent, args, ctx, info) => {
  return _hasUserUuid(ctx) && ctx.user.roles.includes('editor')
})

export const hasEditorRoleMiddleware = async (req, res, next): Promise<void> => {
  const roles: string[] = req.user?.roles ?? []
  if (_hasUserUuid(req) && roles.includes('editor')) {
    next()
  } else {
    res.status(403).send('Forbidden')
  }
}

export const isUserAdmin = rule()(async (parent, args, ctx, info) => {
  return _hasUserUuid(ctx) && ctx.user.roles.includes('user_admin')
})

/**
 * True when JWT payload 'uuid' is the same as `input.userUuid`.
 *
 * If input is an array, check every element of input.
 */
export const isOwner = rule()(async (parent, args, ctx, info) => {
  if (!_hasUserUuid(ctx)) return false
  if (Array.isArray(args.input)) {
    return (args.input as MediaObjectGQLInput[]).every(
      ({ userUuid }) => ctx.user.uuid.toUUID().toString() === userUuid)
  }
  return ctx.user.uuid.toUUID().toString() === args.input.userUuid
})

/**
 * True when the media identified by input.mediaId has the same owner uuid as the JWT payload uuid.
 */
export const isMediaOwner = rule()(async (parent, args, ctx, info): Promise<boolean> => {
  const hasUserUuid = _hasUserUuid(ctx)
  const isMediaOwner = await MediaDataSource.getInstance().isMediaOwner(ctx.user.uuid, args.input?.mediaId)
  return hasUserUuid && isMediaOwner
})

export const isBuilderServiceAccount = rule()(async (parent, args, ctx: Context, info) => {
  return _hasUserUuid(ctx) && ctx.user.isBuilder
})

export const isValidEmail = inputRule()(
  (yup) =>
    yup.object({
      email: yup.string().email('Please provide a valid email')
    }),
  { abortEarly: false }
)

interface Context {
  user: {
    uuid?: string
    isBuilder: boolean
  }
}

const _hasUserUuid = (ctx: Context): boolean => ctx.user.uuid != null
