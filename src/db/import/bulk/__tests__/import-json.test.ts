import { AreaJson, createBulkOperation } from '../import-json';

describe('createBulkOperation', () => {
  it('should insert single new area', () => {
    const json: AreaJson = {
      area_name: 'Test Area',
      metadata: { lnglat: [1, 2] },
    };

    const { operations } = createBulkOperation(json);
    expect(operations).toEqual([
      {
        updateOne: {
          filter: { _id: expect.anything() },
          update: {
            $set: {
              area_name: 'Test Area',
              metadata: {
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
      children: [
        {
          area_name: 'Child Area',
          metadata: { lnglat: [3, 4] },
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
              metadata: {
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
              metadata: {
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
      children: [
        {
          area_name: 'Child Area',
          metadata: { lnglat: [3, 4] },
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
              metadata: {
                lnglat: {
                  type: 'Point',
                  coordinates: [3, 4],
                },
              },
              climbs: [
                {
                  name: 'Test Climb',
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
              metadata: {
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
});
