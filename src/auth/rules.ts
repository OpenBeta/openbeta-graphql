import { rule } from 'graphql-shield'

export const isEditor = rule()(async (parent, args, ctx, info) => {
  return (ctx.user.uuid != null) && ctx.user.roles.includes('editor')
})
