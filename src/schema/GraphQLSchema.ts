import { makeExecutableSchema } from '@graphql-tools/schema'

import { typeDef as Climb } from './ClimbTypeDef.js'
import { typeDef as Area } from './AreaTypeDef.js'
import { GQLFilter, Sort } from '../types'
import { md5 } from '../db/import/utils.js'
import { AreaType, CountByGroupType, PointType } from '../db/AreaTypes.js'

const resolvers = {
  Query: {
    climb: async (_, { id, uuid }: { id: string, uuid: string }, { dataSources }) => {
      if (id !== '' && id !== undefined) return dataSources.climbs.findOneById(id)
      if (uuid !== '' && uuid !== undefined) {
        return dataSources.climbs.findOneByClimbUUID(uuid)
      }
    },
    climbs: async (_, __, { dataSources }) => {
      return dataSources.climbs.collection.find({}).toArray()
    },
    areas: async (
      _,
      { filter, sort }: { filter?: GQLFilter, sort?: Sort },
      { dataSources: { areas } }
    ) => {
      const filtered = await areas.findAreasByFilter(filter)
      return filtered.collation({ locale: 'en' }).sort(sort).toArray()
    },

    area: async (_: any,
      { id, uuid }: { id: string, uuid: string },
      { dataSources: { areas } }) => {
      if (id !== '' && id !== undefined) return areas.findOneById(id)
      if (uuid !== '' && uuid !== undefined) {
        return areas.findOneByAreaUUID(uuid)
      }
      return null
    }
  },

  Climb: {
    // TODO: let's see if we need to create any field resolvers
  },
  Area: {
    children: async (parent, _, { dataSources: { areas } }) => {
      if (parent.children.length > 0) {
        return areas.findManyByIds(parent.children)
      }
      return []
    },
    aggregate: async (parent, _, { dataSources: { areas } }) => {
      // get all leafs under this parent
      const allChildAreas: AreaType[] = await getAllLeafs(areas, parent.pathTokens)
      const bounds: [PointType, PointType] = [
        { lat: Number.POSITIVE_INFINITY, lng: Number.POSITIVE_INFINITY },
        { lat: Number.NEGATIVE_INFINITY, lng: Number.NEGATIVE_INFINITY }]
      const byGrade = {}
      const byType = {}

      let totalClimbs = 0

      allChildAreas.forEach(area => {
        if (area.climbs === undefined) { // shouldn't exist in our set, but handle anyway
          return
        }

        if (area.metadata.lat !== null && area.metadata.lng !== null) {
          updateBounds(area.metadata.lat, area.metadata.lng, bounds)
        }

        area.climbs.forEach((climb) => {
          const { yds, type, metadata: { lat, lng } } = climb
          // Grade
          const entry: CountByGroupType = byGrade[yds] === undefined ? { label: yds, count: 0 } : byGrade[yds]
          entry.count = entry.count + 1
          byGrade[yds] = entry
          if (lat !== null && lng !== null) {
            updateBounds(lat, lng, bounds)
          }
          for (const t in type) {
            if (type[t] !== false) {
              const entry: CountByGroupType = byType[t] !== undefined ? byType[t] : { label: t, count: 0 }
              byType[t] = Object.assign(entry, { count: entry.count + 1 })
            }
          }
          totalClimbs += 1
        })
      })

      const density = getAreaDensity(bounds, totalClimbs)

      return {
        byGrade: Object.values(byGrade),
        byType: Object.values(byType),
        bounds,
        density,
        totalClimbs
      }
    },
    ancestors: async (parent, _, { dataSources: { areas } }) => {
      const ancestors: string[] = []
      const tokens = parent.pathTokens
      for (let i = 0; i < tokens.length; i++) {
        const pathHash = md5(tokens.slice(0, i).join('/'))
        ancestors.push(pathHash)
      }
      const areaAncestors = await areas.findManyByPathHash(ancestors)
      return areaAncestors.map(area => area.metadata.area_id)
    }
  }
}

const getAllLeafs = async (areas, parentTokens): Promise<AreaType[]> => {
  const childAreasCollection = await areas.findAreasByFilter({ leaf_status: { isLeaf: true }, path_tokens: { tokens: parentTokens, exactMatch: false } })
  return childAreasCollection.toArray()
}

const getAreaDensity = (bounds: [PointType, PointType], totalClimbs: number): number => {
  const areaInKm = (bounds[1].lat - bounds[0].lat) * (bounds[1].lng - bounds[0].lng) * 111 * 111
  const minArea = areaInKm === 0 ? 5 : areaInKm
  return totalClimbs / minArea
}

const updateBounds = (lat: number, lng: number, bound: [PointType, PointType]): void => {
  // Bottom left of bounding box
  bound[0].lat = Math.min(bound[0].lat, lat)
  bound[0].lng = Math.min(bound[0].lng, lng)
  // Top Right of bounding box
  bound[1].lat = Math.max(bound[1].lat, lat)
  bound[1].lng = Math.max(bound[1].lng, lng)
}

export const schema = makeExecutableSchema({
  typeDefs: [Climb, Area],
  resolvers
})
