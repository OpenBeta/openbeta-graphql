import {ApolloServer} from "apollo-server-express";
import muuid from "uuid-mongodb";
import express from "express";
import {InMemoryDB} from "../utils/inMemoryDB.js";
import {queryAPI, setUpServer} from "../utils/testUtils.js";
import {muuidToString} from "../utils/helpers.js";
import exampleImportData from './import-example.json' assert {type: 'json'};
import {AreaType} from "../db/AreaTypes.js";
import {BulkImportResultType} from "../db/BulkImportTypes.js";
import MutableClimbDataSource from "../model/MutableClimbDataSource.js";
import BulkImportDataSource from "../model/BulkImportDataSource.js";

describe('bulkImportAreas', () => {
  const query = `
    mutation bulkImportAreas($input: BulkImportInput!) {
      bulkImportAreas(input: $input) {
        addedAreas {
          uuid
          metadata {
            area_id
          }
        }
        updatedAreas {
          uuid
          metadata {
            area_id
          }
        }
        addedOrUpdatedClimbs {
          id
        }
      }
    }
  `

  let server: ApolloServer
  let user: muuid.MUUID
  let userUuid: string
  let app: express.Application
  let inMemoryDB: InMemoryDB
  let testArea: AreaType

  let bulkImport: BulkImportDataSource
  let climbs: MutableClimbDataSource

  beforeAll(async () => {
    ({server, inMemoryDB, app} = await setUpServer())
    // Auth0 serializes uuids in "relaxed" mode, resulting in this hex string format
    // "59f1d95a-627d-4b8c-91b9-389c7424cb54" instead of base64 "WfHZWmJ9S4yRuTicdCTLVA==".
    user = muuid.mode('relaxed').v4()
    userUuid = muuidToString(user)

    bulkImport = BulkImportDataSource.getInstance()
    climbs = MutableClimbDataSource.getInstance()
  })

  beforeEach(async () => {
    await inMemoryDB.clear()
    await bulkImport.addCountry('usa')
    testArea = await bulkImport.addArea(user, "Test Area", null, "us")
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })

  it('should return 403 if no user', async () => {
    const res = await queryAPI({
      app,
      query,
      operationName: 'bulkImportAreas',
      variables: {input: exampleImportData}
    })
    expect(res.statusCode).toBe(200)
    expect(res.body.errors[0].message).toBe('Not Authorised!')
  })

  it('should return 403 if user is not an editor', async () => {
    const res = await queryAPI({
      app,
      userUuid,
      query,
      operationName: 'bulkImportAreas',
      variables: {input: exampleImportData}
    })
    expect(res.statusCode).toBe(200)
    expect(res.body.errors[0].message).toBe('Not Authorised!')
  })

  it('should return 200 if user is an editor', async () => {
    const res = await queryAPI({
      app,
      userUuid,
      roles: ['editor'],
      query,
      operationName: 'bulkImportAreas',
      variables: {input: exampleImportData}
    })
    expect(res.status).toBe(200)
  })

  it('should import data', async () => {
    const res = await queryAPI({
      app,
      userUuid,
      roles: ['editor'],
      query,
      operationName: 'bulkImportAreas',
      variables: {
        input: {
          areas: [
            ...exampleImportData.areas,
            {
              uuid: testArea.metadata.area_id,
              areaName: "Updated Test Area",
            }
          ]
        }
      }
    });
    expect(res.body.errors).toBeFalsy()

    const result = res.body.data.bulkImportAreas as BulkImportResultType
    expect(result.addedAreas.length).toBe(4)

    const committedAreas = await Promise.all(result.addedAreas.map((area) => bulkImport.findOneAreaByUUID(muuid.from(area.metadata.area_id))));
    expect(committedAreas.length).toBe(4);

    const committedClimbs = await Promise.all(result.addedOrUpdatedClimbs.map((climb) => climbs.findOneClimbByMUUID(climb._id)));
    expect(committedClimbs.length).toBe(2);

    const updatedAreas = await Promise.all(result.updatedAreas.map((area) => bulkImport.findOneAreaByUUID(muuid.from(area.metadata.area_id))));
    expect(updatedAreas.length).toBe(1);
    expect(updatedAreas[0].area_name).toBe("Updated Test Area");
  })
});