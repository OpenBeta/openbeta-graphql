import { area, Database, entity } from '@schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface TestArea {
  id: number;
  uuid: string;
  name: string;
  area_name: string;
  gradeContext: string;
  density: number;
  totalClimbs: number;
  isLeaf: boolean;
  parent: number | null;
}

export class TestDataHelper {
  constructor(private db: Database) {}

  async createTestArea(overrides: Partial<TestArea> = {}): Promise<TestArea> {
    const defaultArea = {
      name: 'Test Area ' + Date.now(),
      area_name: 'Test Area ' + Date.now(),
      gradeContext: 'US',
      density: 0.5,
      totalClimbs: 10,
      isLeaf: false,
      parent: null,
    };

    const areaData = { ...defaultArea, ...overrides };

    // First create the entity
    const [entityResult] = await this
      .db
      .insert(entity)
      .values({
        entityType: 'area',
        name: areaData.name,
        parent: areaData.parent,
        uuid: uuidv4(),
      })
      .returning({ id: entity.id, uuid: entity.uuid });

    // Then create the area
    const [areaResult] = await this
      .db
      .insert(area)
      .values({
        id: entityResult.id,
        name: areaData.area_name,
        density: areaData.density,
        totalClimbs: areaData.totalClimbs,
      })
      .returning();

    return {
      id: entityResult.id,
      uuid: entityResult.uuid,
      name: areaData.name,
      area_name: areaData.area_name,
      gradeContext: areaData.gradeContext,
      density: areaData.density,
      totalClimbs: areaData.totalClimbs,
      isLeaf: areaData.isLeaf,
      parent: areaData.parent,
    };
  }

  async createTestCountry(name: string): Promise<TestArea> {
    return this.createTestArea({
      name,
      area_name: name,
      isLeaf: false,
      parent: null,
    });
  }

  async createTestCrag(name: string, parentId: number): Promise<TestArea> {
    return this.createTestArea({
      name,
      area_name: name,
      isLeaf: true,
      parent: parentId,
      density: 2.5,
      totalClimbs: 25,
    });
  }

  async cleanupTestData(): Promise<void> {
    // Delete all test data (areas and their entities)
    await this.db.delete(area);
    await this.db.delete(entity);
  }

  async getAreaByUuid(uuid: string) {
    return this
      .db
      .select({
        entity: entity,
        area: area,
      })
      .from(entity)
      .innerJoin(area, eq(entity.id, area.id))
      .where(eq(entity.uuid, uuid))
      .limit(1);
  }
}
