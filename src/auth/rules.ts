import { rule } from 'graphql-shield'

export const isEditor = rule()(async (parent, args, ctx, info) => {
  return ctx.user.roles.includes('editor')
})
