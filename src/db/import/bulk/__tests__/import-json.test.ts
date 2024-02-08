import { ChangeStream } from 'mongodb';
import mongoose from 'mongoose';
import muuid from 'uuid-mongodb';
import {
  connectDB,
  getAreaModel,
  getClimbModel,
} from '../../../../db/index.js';
import { changelogDataSource } from '../../../../model/ChangeLogDataSource.js';
import MutableAreaDataSource from '../../../../model/MutableAreaDataSource.js';
import MutableClimbDataSource from '../../../../model/MutableClimbDataSource.js';
import { AreaType } from '../../../AreaTypes.js';
import { ClimbType } from '../../../ClimbTypes.js';
import streamListener from '../../../edit/streamListener.js';
import { AreaJson, BulkImportResult, bulkImportJson } from '../import-json.js';

type TestResult = BulkImportResult & {
  addedAreas: Partial<AreaType>[];
  addedClimbs: Partial<ClimbType>[];
};

describe('bulk import e2e', () => {
  let areas: MutableAreaDataSource;
  let climbs: MutableClimbDataSource;
  let stream: ChangeStream;
  const testUser = muuid.v4();

  const assertBulkImport = async (...json: AreaJson[]): Promise<TestResult> => {
    const result = await bulkImportJson({
      user: testUser,
      json,
      areas,
    });

    const isFulfilled = <T>(
      p: PromiseSettledResult<T>
    ): p is PromiseFulfilledResult<T> => p.status === 'fulfilled';
    const isRejected = <T>(
      p: PromiseSettledResult<T>
    ): p is PromiseRejectedResult => p.status === 'rejected';
    const comittedAreas = await Promise.allSettled(
      result.addedAreas.map((area) =>
        areas.findOneAreaByUUID(area.metadata.area_id)
      )
    );
    const comittedClimbs = await Promise.allSettled(
      result.climbIds.map((id) => climbs.findOneClimbByMUUID(muuid.from(id)))
    );

    return {
      ...result,
      errors: [
        ...result.errors,
        ...comittedAreas.filter(isRejected).map((p) => p.reason),
        ...comittedClimbs.filter(isRejected).map((p) => p.reason),
      ],
      addedAreas: comittedAreas.filter(isFulfilled).map((p) => p.value),
      addedClimbs: comittedClimbs
        .filter(isFulfilled)
        .map((p) => p.value as Partial<ClimbType>),
    };
  };

  beforeAll(async () => {
    await connectDB();
    stream = await streamListener();
  });

  afterAll(async () => {
    try {
      await stream.close();
      await mongoose.disconnect();
    } catch (e) {
      console.log('error closing mongoose', e);
    }
  });

  beforeEach(async () => {
    areas = MutableAreaDataSource.getInstance();
    climbs = MutableClimbDataSource.getInstance();

    await areas.addCountry('us');
  });

  afterEach(async () => {
    await changelogDataSource._testRemoveAll();
    try {
      await getAreaModel().collection.drop();
    } catch {}
    try {
      await getClimbModel().collection.drop();
    } catch {}
  });

  describe('adding new areas and climbs', () => {
    it('should commit a new minimal area to the database', async () => {
      await expect(
        assertBulkImport({
          areaName: 'Minimal Area',
          countryCode: 'us',
        })
      ).resolves.toMatchObject({
        errors: [],
        addedAreas: [
          {
            area_name: 'Minimal Area',
            gradeContext: 'US',
            metadata: {
              leaf: false,
              isBoulder: false,
            },
          },
        ],
      });
    });

    it('should rollback when one of the areas fails to import', async () => {
      await expect(
        assertBulkImport(
          {
            areaName: 'Test Area',
            countryCode: 'us',
          },
          {
            areaName: 'Test Area 2',
          }
        )
      ).resolves.toMatchObject({
        errors: expect.arrayContaining([expect.any(Error)]),
        addedAreas: [],
      });
    });

    it('should import nested areas with children', async () => {
      await expect(
        assertBulkImport({
          areaName: 'Parent Area',
          countryCode: 'us',
          children: [
            {
              areaName: 'Child Area 2',
            },
          ],
        })
      ).resolves.toMatchObject({
        errors: [],
        addedAreas: [
          { area_name: 'Parent Area', gradeContext: 'US' },
          { area_name: 'Child Area 2', gradeContext: 'US' },
        ] as Partial<AreaType>[],
      });
    });

    it('should import nested areas with children and grandchildren', async () => {
      await expect(
        assertBulkImport({
          areaName: 'Test Area',
          countryCode: 'us',
          children: [
            {
              areaName: 'Test Area 2',
              children: [
                {
                  areaName: 'Test Area 3',
                },
              ],
            },
          ],
        })
      ).resolves.toMatchObject({
        errors: [],
        addedAreas: [
          {
            area_name: 'Test Area',
            pathTokens: ['United States of America', 'Test Area'],
          },
          {
            area_name: 'Test Area 2',
            pathTokens: [
              'United States of America',
              'Test Area',
              'Test Area 2',
            ],
          },
          {
            area_name: 'Test Area 3',
            pathTokens: [
              'United States of America',
              'Test Area',
              'Test Area 2',
              'Test Area 3',
            ],
          },
        ] as Partial<AreaType>[],
      });
    });

    it('should import leaf areas with climbs', async () => {
      await expect(
        assertBulkImport({
          areaName: 'Test Area',
          countryCode: 'us',
          climbs: [
            {
              name: 'Test Climb',
              grade: '5.10a',
              disciplines: { sport: true },
            },
          ],
        })
      ).resolves.toMatchObject({
        errors: [],
        addedAreas: [
          {
            area_name: 'Test Area',
            gradeContext: 'US',
            metadata: {
              leaf: true,
              isBoulder: false,
            },
            climbs: [expect.anything()],
          },
        ],
        addedClimbs: [
          {
            name: 'Test Climb',
            grades: {
              yds: '5.10a',
            },
          },
        ],
      });
    });
  });

  describe('updating existing areas', () => {
    let area: AreaType;
    beforeEach(async () => {
      const result = await assertBulkImport({
        areaName: 'Existing Area',
        countryCode: 'us',
      });
      area = result.addedAreas[0] as AreaType;
    });

    it('should update an existing area', async () => {
      await expect(
        assertBulkImport({
          id: area.metadata.area_id,
          areaName: 'New Name',
        })
      ).resolves.toMatchObject({
        errors: [],
        addedAreas: [{ area_name: 'New Name' }],
      });
    });
  });
});
