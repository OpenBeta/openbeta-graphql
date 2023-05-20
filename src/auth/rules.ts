import { rule, inputRule } from 'graphql-shield'
import muuid from 'uuid-mongodb'

export const isEditor = rule()(async (parent, args, ctx, info) => {
  return _hasUserUuid(ctx) && ctx.user.roles.includes('editor')
})

export const isUserAdmin = rule()(async (parent, args, ctx, info) => {
  return _hasUserUuid(ctx) && ctx.user.roles.includes('user_admin')
})

export const isOwner = rule()(async (parent, args, ctx, info) => {
  return _hasUserUuid(ctx) && ctx.user.uuid === muuid.from(args.userUuid)
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
