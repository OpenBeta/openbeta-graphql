import { GradeContexts } from '../../../../GradeUtils.js';
import { AreaJson, createBulkOperation } from '../import-json.js';

describe('createBulkOperation', () => {
  it('should insert single new area', () => {
    const json: AreaJson = {
      area_name: 'Test Area',
      metadata: { lnglat: [1, 2] },
      gradeContext: GradeContexts.US,
    };

    const { operations } = createBulkOperation(json);
    expect(operations).toEqual([
      {
        updateOne: {
          filter: { _id: expect.anything() },
          update: {
            $set: {
              area_name: 'Test Area',
              content: {},
              climbs: [],
              gradeContext: 'US',
              metadata: {
                leaf: false,
                isBoulder: false,
                lnglat: {
                  type: 'Point',
                  coordinates: [1, 2],
                },
              },
            },
          },
          upsert: true,
        },
      },
    ]);
  });

  it('should insert single new area with children', () => {
    const json: AreaJson = {
      area_name: 'Test Area',
      metadata: { lnglat: [1, 2] },
      gradeContext: GradeContexts.US,
      children: [
        {
          area_name: 'Child Area',
          metadata: { lnglat: [3, 4] },
          gradeContext: GradeContexts.US,
        },
      ],
    };

    const { operations } = createBulkOperation(json);
    expect(operations).toEqual([
      {
        updateOne: {
          filter: { _id: expect.anything() },
          update: {
            $set: {
              area_name: 'Child Area',
              content: {},
              climbs: [],
              gradeContext: 'US',
              metadata: {
                leaf: false,
                isBoulder: false,
                lnglat: {
                  type: 'Point',
                  coordinates: [3, 4],
                },
              },
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { _id: expect.anything() },
          update: {
            $set: {
              area_name: 'Test Area',
              content: {},
              climbs: [],
              gradeContext: 'US',
              metadata: {
                leaf: false,
                isBoulder: false,
                lnglat: {
                  type: 'Point',
                  coordinates: [1, 2],
                },
              },
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { _id: expect.anything() },
          update: {
            $push: {
              children: expect.anything(),
            },
          },
        },
      },
    ]);
  });

  it('should insert single new area with children and climbs', () => {
    const json: AreaJson = {
      area_name: 'Test Area',
      metadata: { lnglat: [1, 2] },
      gradeContext: GradeContexts.UIAA,
      children: [
        {
          area_name: 'Child Area',
          metadata: { lnglat: [3, 4] },
          gradeContext: GradeContexts.UIAA,
          climbs: [
            {
              name: 'Test Climb',
              grades: {
                uiaa: '7+',
              },
            },
          ],
        },
      ],
    };

    const { operations } = createBulkOperation(json);
    expect(operations).toEqual([
      {
        updateOne: {
          filter: { _id: expect.anything() },
          update: {
            $set: {
              area_name: 'Child Area',
              content: {},
              gradeContext: 'UIAA',
              metadata: {
                leaf: true,
                isBoulder: false,
                lnglat: {
                  type: 'Point',
                  coordinates: [3, 4],
                },
              },
              climbs: [
                {
                  _id: expect.anything(),
                  name: 'Test Climb',
                  content: {},
                  metadata: {},
                  type: { sport: true },
                  grades: {
                    uiaa: '7+',
                  },
                },
              ],
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { _id: expect.anything() },
          update: {
            $set: {
              area_name: 'Test Area',
              content: {},
              gradeContext: 'UIAA',
              climbs: [],
              metadata: {
                leaf: false,
                isBoulder: false,
                lnglat: {
                  type: 'Point',
                  coordinates: [1, 2],
                },
              },
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { _id: expect.anything() },
          update: {
            $push: {
              children: expect.anything(),
            },
          },
        },
      },
    ]);
  });

  it('should add the required missing default properties', () => {
      const json: AreaJson = {
        area_name: 'Test Area',
        gradeContext: GradeContexts.UIAA,
        climbs: [
          {
            name: 'Test Climb',
            grades: {
              uiaa: '7+',
            },
          },
        ]
      };

      const { operations } = createBulkOperation(json);
      expect(operations).toEqual([
        {
          updateOne: {
            filter: { _id: expect.anything() },
            update: {
              $set: {
                area_name: 'Test Area',
                gradeContext: 'UIAA',
                content: {},
                metadata: {
                  leaf: true,
                  isBoulder: false,
                  lnglat: undefined
                },
                climbs: [
                  {
                    _id: expect.anything(),
                    name: 'Test Climb',
                    grades: {
                      uiaa: '7+',
                    },
                    type: { sport: true },
                    metadata: {},
                    content: {}
                  },
                ],
              },
            },
            upsert: true,
          },
        },
      ]);
    });
});
