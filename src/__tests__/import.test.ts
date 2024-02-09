import {ApolloServer} from "apollo-server-express";
import muuid from "uuid-mongodb";
import express from "express";
import {InMemoryDB} from "../utils/inMemoryDB.js";
import {queryAPI, setUpServer} from "../utils/testUtils.js";
import {muuidToString} from "../utils/helpers.js";
import MutableAreaDataSource from "../model/MutableAreaDataSource.js";
import exampleImportData from './import-example.json' assert {type: 'json'};
import {AreaType} from "../db/AreaTypes.js";
import {BulkImportResult} from "../db/import/json/import-json";

describe('/import', () => {
  const endpoint = '/import'
  let server: ApolloServer
  let user: muuid.MUUID
  let userUuid: string
  let app: express.Application
  let inMemoryDB: InMemoryDB
  let testArea: AreaType

  let areas: MutableAreaDataSource

  beforeAll(async () => {
    ({server, inMemoryDB, app} = await setUpServer())
    // Auth0 serializes uuids in "relaxed" mode, resulting in this hex string format
    // "59f1d95a-627d-4b8c-91b9-389c7424cb54" instead of base64 "WfHZWmJ9S4yRuTicdCTLVA==".
    user = muuid.mode('relaxed').v4()
    userUuid = muuidToString(user)
  })

  beforeEach(async () => {
    await inMemoryDB.clear()
    areas = MutableAreaDataSource.getInstance()
    await areas.addCountry('usa')
    testArea = await areas.addArea(user, "Test Area", null, "us")
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })

  it('should return 403 if no user', async () => {
    const res = await queryAPI({
      app,
      endpoint,
      body: exampleImportData
    })
    expect(res.status).toBe(403)
    expect(res.text).toBe('Forbidden')
  })

  it('should return 403 if user is not an editor', async () => {
    const res = await queryAPI({
      app,
      endpoint,
      userUuid,
      body: exampleImportData
    })
    expect(res.status).toBe(403)
    expect(res.text).toBe('Forbidden')
  })

  it('should return 200 if user is an editor', async () => {
    const res = await queryAPI({
      app,
      endpoint,
      userUuid,
      roles: ['editor'],
      body: exampleImportData
    })
    expect(res.status).toBe(200)
  })

  it('should import data', async () => {
    const res = await queryAPI({
      app,
      endpoint,
      userUuid,
      roles: ['editor'],
      body: {
        areas: [
          ...exampleImportData.areas,
          {
            id: testArea.metadata.area_id.toUUID().toString(),
            areaName: "Updated Test Area",
          }
        ],
      },
    });
    expect(res.status).toBe(200)

    const result = res.body as BulkImportResult
    expect(result.addedAreaIds.length).toBe(4)

    const committedAreas = await Promise.all(result.addedAreaIds.map((areaId: string) => areas.findOneAreaByUUID(muuid.from(areaId))));
    expect(committedAreas.length).toBe(4);

    const committedClimbs = await Promise.all(result.climbIds.map((id: string) => areas.findOneClimbByUUID(muuid.from(id))));
    expect(committedClimbs.length).toBe(2);

    const updatedAreas = await Promise.all(result.updatedAreaIds.map((areaId: any) => areas.findOneAreaByUUID(muuid.from(areaId))));
    expect(updatedAreas.length).toBe(1);
    expect(updatedAreas[0].area_name).toBe("Updated Test Area");
  })
});