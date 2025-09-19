import { FieldNode, GraphQLResolveInfo, Kind, SelectionNode } from 'graphql'

function selectNode<T extends SelectionNode> (node: SelectionNode, type: T['kind']): node is T {
  return node.kind === type
}

function selector (type) {
  return (node) => selectNode(node, type)
}

function simpleFields (nodes: GraphQLResolveInfo['fieldNodes']): FieldNode[][] {
  return nodes.map(set => set.selectionSet?.selections.filter(selector(Kind.FIELD)) as FieldNode[] ?? [])
}

export function flatFieldSet (info: GraphQLResolveInfo): Array<Record<string, boolean>> {
  return simpleFields(info.fieldNodes)
    .map(set => set.reduce((acc, { name }) =>
      ({ ...acc, [name.value]: true }), {}
    ))
}
