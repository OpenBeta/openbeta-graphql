import {
  ClimbChangeInputType,
  ClimbType,
  DisciplineType
} from '../../db/ClimbTypes'
import { AreaType } from '../../db/AreaTypes'
import { dbTest } from './mongo.fixtures'
import muuid, { MUUID } from 'uuid-mongodb'
import { muuidToString } from '../../utils/helpers'
import isoCountries, { Alpha3Code } from 'i18n-iso-countries'
import { UserPublicProfile } from '../../db/UserTypes'
import { createGradeObject, gradeContextToGradeScales } from '../../GradeUtils'
import { getScale, GradeScalesTypes } from '@openbeta/sandbag'
import CountriesLngLat from '../../data/countries-with-lnglat.json'
import { TickStyle, TickAttemptType } from '../../db/TickTypes'

export const allowableStyleMap: Record<TickStyle, TickAttemptType[]> = {
  Lead: ['Onsight', 'Flash', 'Redpoint', 'Pinkpoint', 'Attempt', 'Frenchfree'],
  Solo: ['Onsight', 'Flash', 'Redpoint', 'Attempt'],
  Boulder: ['Flash', 'Send', 'Attempt'],
  TR: ['Send', 'Attempt'],
  Follow: ['Send', 'Attempt'],
  Aid: ['Send', 'Attempt']
}

export function choose<T> (arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

interface DbTestContext {
  user: MUUID
  userUuid: string
  profile: UserPublicProfile

  addArea: (
    name?: string,
    extra?: Partial<{
      leaf: boolean
      boulder: boolean
      parent: MUUID | AreaType
    }>,
  ) => Promise<AreaType>
  countryCode: Alpha3Code
  country: AreaType
  area: AreaType

  addClimb: (props?: Partial<ClimbChangeInputType>) => Promise<ClimbType>
  climb: ClimbType

  gradeSystemFor: (climb: { type: DisciplineType }) => GradeScalesTypes

  /**
   * Given the country that has been supplied to this test context, what would be a
   * valid grade to generate for a given climb object
   */
  randomGrade: (climb: ClimbType | { type: DisciplineType }) => string
}

beforeAll(() => {
  const availableCountries: Alpha3Code[] = Object.keys(
    isoCountries.getAlpha3Codes()
  ).filter((country) => CountriesLngLat[country]) as Alpha3Code[]

  for (const country of availableCountries) {
    if (gradeContextToGradeScales[country] !== undefined) continue
    gradeContextToGradeScales[country] = gradeContextToGradeScales.US
  }
})

export const dataFixtures = dbTest.extend<DbTestContext>({
  user: async ({ task }, use) => await use(muuid.v4()),
  userUuid: async ({ user }, use) => await use(muuidToString(user)),
  profile: async ({ task, user, users, userUuid }, use) => {
    await users.createOrUpdateUserProfile(user, {
      userUuid,
      username: task.id,
      email: 'cat@example.com'
    })

    const profile = await users.getUserPublicProfileByUuid(user)
    assert(profile != null)
    await use(profile)

    await users.deleteFromCacheByFields({ username: task.id })
  },

  countryCode: async ({ client, areas }, use) => {
    // atomically fetch & reserve one unused country:
    const res = await client.db()
      .collection('test_countries')
      .findOneAndUpdate(
        { reserved: false },
        { $set: { reserved: true } },
        { returnDocument: 'after' }
      )

    if (res.value == null) throw new Error('no more country codes in the pool')
    const code = res.value.code as Alpha3Code

    await use(code)

    // teardown:
    // release this area back to the queue
    await areas.areaModel.deleteOne({ area_name: isoCountries.getName(code, 'en') })
    await expect(areas.areaModel.find({ pathTokens: { $size: 1 } }).then(x => x.map(i => i.area_name)))
      .not
      .toContain(isoCountries.getName(code, 'en'))
    await client.db()
      .collection('test_countries')
      .updateOne({ code }, { $set: { reserved: false } })
  },

  country: async ({ areas, countryCode }, use) => {
    const country = await areas.addCountry(countryCode)
    assert(country !== null)

    assert(country.shortCode)
    gradeContextToGradeScales[country.shortCode] = gradeContextToGradeScales.US

    await use(country)

    await areas.areaModel.deleteMany({ 'embeddedRelations.ancestors._id': country._id })
    await areas.areaModel.deleteOne({ _id: country._id }).orFail()
    await expect(areas.areaModel.find({ pathTokens: { $size: 1 } }).then(x => x.map(i => i.area_name)))
      .not
      .toContain(country.area_name)
  },

  addArea: async ({ task, country, user, areas }, use) => {
    async function addArea (
      name?: string,
      extra?: Partial<{
        leaf: boolean
        boulder: boolean
        parent: MUUID | AreaType
      }>
    ): Promise<AreaType> {
      function isArea (x: any): x is AreaType {
        return typeof x.metadata?.area_id !== 'undefined'
      }

      if (name === undefined || name === 'test') {
        name = task.id + process.uptime().toString()
      }

      let parent: MUUID | undefined
      if (extra?.parent != null) {
        if (isArea(extra.parent)) {
          parent = extra.parent.metadata?.area_id
        } else {
          parent = extra.parent
        }
      }

      return await areas.addArea(
        user,
        name,
        parent ?? country.metadata.area_id,
        undefined,
        undefined,
        extra?.leaf,
        extra?.boulder
      )
    }

    await use(addArea)

    await areas.areaModel.deleteMany({ area_name: { $regex: `^${task.id}` } })
  },
  area: async ({ addArea }, use) => {
    await use(await addArea())
  },

  addClimb: async ({ climbs, area, task, user }, use) => {
    async function addClimb (
      data?: Partial<ClimbChangeInputType>
    ): Promise<ClimbType> {
      const [id] = await climbs.addOrUpdateClimbs(user, area.metadata.area_id, [
        {
          name: task.id + process.uptime().toString(),
          disciplines: data?.disciplines ?? {
            sport: true
          },
          description: 'A good warm up problem',
          location: 'Start from the left arete',
          protection: '2 bolts',
          boltsCount: 2,
          ...(data ?? {})
        }
      ])

      const climb = await climbs.findOneClimbByMUUID(muuid.from(id))
      assert(climb != null)
      return climb
    }

    await use(addClimb)

    await climbs.climbModel.deleteMany({
      name: { $regex: `^${task.id}` }
    })
  },
  climb: async ({ addClimb }, use) => {
    await use(await addClimb())
  },

  gradeSystemFor: async ({ country }, use) => {
    const ctx = gradeContextToGradeScales[country.gradeContext]
    assert(ctx !== undefined)

    const generate = (climb: { type: DisciplineType }): GradeScalesTypes => {
      const key = Object.keys(climb.type).filter((type) => climb.type[type])[0]
      const system: GradeScalesTypes =
        gradeContextToGradeScales[country.gradeContext]?.[key]
      assert(system)
      return system
    }

    await use(generate)
  },

  randomGrade: async ({ country, gradeSystemFor }, use) => {
    const ctx = gradeContextToGradeScales[country.gradeContext]
    assert(ctx !== undefined)

    const generate = (climb: ClimbType): string => {
      const system = gradeSystemFor(climb)

      const scale = getScale(system)
      assert(scale, `no support for system ${system}`)
      const grade = scale.getGrade(Math.floor(Math.random() * 100))
      assert(grade)

      const record = createGradeObject(grade, climb.type, ctx)
      assert(record !== undefined)

      const first = record[Object.keys(record)[0]]
      assert(first)
      return first
    }

    await use(generate)
  }
})
