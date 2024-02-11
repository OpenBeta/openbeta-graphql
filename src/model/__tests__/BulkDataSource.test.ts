import {ChangeStream} from 'mongodb';
import muuid from 'uuid-mongodb';
import {changelogDataSource} from '../ChangeLogDataSource.js';
import MutableClimbDataSource from '../MutableClimbDataSource.js';
import {AreaType} from '../../db/AreaTypes.js';
import {ClimbType} from '../../db/ClimbTypes.js';
import streamListener from '../../db/edit/streamListener.js';
import inMemoryDB from "../../utils/inMemoryDB.js";
import {isFulfilled} from "../../utils/testUtils.js";
import BulkImportDataSource from "../BulkImportDataSource.js";
import {BulkImportAreaInputType, BulkImportResultType} from "../../db/BulkImportTypes.js";

describe('bulk import e2e', () => {
  let bulkImport: BulkImportDataSource;
  let climbs: MutableClimbDataSource;
  let stream: ChangeStream;
  const testUser = muuid.v4();

  const assertBulkImport = async (...input: BulkImportAreaInputType[]): Promise<BulkImportResultType> => {
    const result = await bulkImport.bulkImport({
      user: testUser,
      input: {areas: input},
      climbs
    });

    const addedAreas = await Promise.allSettled(
      result.addedAreas.map((area) =>
        bulkImport.findOneAreaByUUID(area.metadata.area_id)
      )
    );
    const updatedAreas = await Promise.allSettled(
      result.updatedAreas.map((area) =>
        bulkImport.findOneAreaByUUID(area.metadata.area_id)
      )
    );
    const addedOrUpdatedClimbs = await Promise.allSettled(
      result.addedOrUpdatedClimbs.map((climb) => climbs.findOneClimbByMUUID(climb._id))
    );

    return {
      addedAreas: addedAreas.filter(isFulfilled).map((p) => p.value),
      updatedAreas: updatedAreas.filter(isFulfilled).map((p) => p.value),
      addedOrUpdatedClimbs: addedOrUpdatedClimbs.filter(isFulfilled).map((p) => p.value as ClimbType),
    };
  };

  beforeAll(async () => {
    await inMemoryDB.connect()
    stream = await streamListener();
  });

  afterAll(async () => {
    try {
      await stream.close();
      await inMemoryDB.close()
    } catch (e) {
      console.log('error closing mongoose', e);
    }
  });

  beforeEach(async () => {
    bulkImport = BulkImportDataSource.getInstance();
    climbs = MutableClimbDataSource.getInstance();

    await bulkImport.addCountry('us');
  });

  afterEach(async () => {
    await changelogDataSource._testRemoveAll();
    await inMemoryDB.clear()
  });

  describe('adding new areas and climbs', () => {
    it('should commit a new minimal area to the database', async () => {
      await expect(
        assertBulkImport({
          areaName: 'Minimal Area',
          countryCode: 'us',
        })
      ).resolves.toMatchObject({
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
      ).rejects.toThrowError("Must provide parent Id or country code");
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
        addedAreas: [
          {area_name: 'Parent Area', gradeContext: 'US'},
          {area_name: 'Child Area 2', gradeContext: 'US'},
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
              disciplines: {sport: true},
            },
          ],
        })
      ).resolves.toMatchObject({
        addedAreas: [
          {
            area_name: 'Test Area',
            gradeContext: 'US',
            metadata: {
              leaf: true,
              isBoulder: false,
            },
            climbs: [{
              name: 'Test Climb',
              grades: {
                yds: '5.10a',
              },
            }],
          },
        ],
        addedOrUpdatedClimbs: [
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
          uuid: area.metadata.area_id,
          areaName: 'New Name',
        })
      ).resolves.toMatchObject({
        updatedAreas: [{area_name: 'New Name'}],
      });
    });
  });
});
