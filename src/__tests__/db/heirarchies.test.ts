import * as schema from '@schema';
import { eq } from 'drizzle-orm';
import { describe } from 'vitest';
import { expect, test } from '../fixtures';

describe('Entity Hierarchies (Triggers)', () => {
  test('Insert: should populate ancestors for a single entity', async ({ db }) => {
    const [entity] = await db
      .insert(schema.entity)
      .values({
        entityType: 'area',
        name: 'Root',
      })
      .returning();

    const ancestors = await db.select().from(schema.entityAncestors).where(
      eq(schema.entityAncestors.entityId, entity.id),
    );
    expect(ancestors).toHaveLength(1);
    expect(ancestors[0].ancestorId).toBe(entity.id);
  });

  test('Insert: should populate ancestors for a hierarchy', async ({ db }) => {
    const [root] = await db
      .insert(schema.entity)
      .values({
        entityType: 'area',
        name: 'Root',
      })
      .returning();

    const [child] = await db
      .insert(schema.entity)
      .values({
        entityType: 'area',
        name: 'Child',
        parent: root.id,
      })
      .returning();

    const [grandchild] = await db
      .insert(schema.entity)
      .values({
        entityType: 'area',
        name: 'Grandchild',
        parent: child.id,
      })
      .returning();

    const childAncestors = await db.select().from(schema.entityAncestors).where(
      eq(schema.entityAncestors.entityId, child.id),
    );
    const childAncestorIds = childAncestors.map((a) => a.ancestorId).sort((
      a,
      b,
    ) => a - b);
    expect(childAncestorIds).toEqual([root.id, child.id].sort((a, b) => a - b));

    const grandchildAncestors = await db
      .select()
      .from(schema.entityAncestors)
      .where(eq(schema.entityAncestors.entityId, grandchild.id));
    const grandchildAncestorIds = grandchildAncestors
      .map((a) => a.ancestorId)
      .sort((a, b) => a - b);
    expect(grandchildAncestorIds).toEqual(
      [root.id, child.id, grandchild.id].sort((a, b) => a - b),
    );
  });

  test('Update: should update ancestors when parent changes', async ({ db }) => {
    const [a] = await db
      .insert(schema.entity)
      .values({ entityType: 'area', name: 'A' })
      .returning();
    const [b] = await db
      .insert(schema.entity)
      .values({ entityType: 'area', name: 'B' })
      .returning();
    const [c] = await db
      .insert(schema.entity)
      .values({
        entityType: 'area',
        name: 'C',
        parent: a.id,
      })
      .returning();

    // Verify initial ancestors for C
    const initial = await db.select().from(schema.entityAncestors).where(
      eq(schema.entityAncestors.entityId, c.id),
    );
    expect(initial.map((a) => a.ancestorId).sort((a, b) => a - b)).toEqual(
      [a.id, c.id].sort((a, b) => a - b),
    );

    // Move C to B
    await db.update(schema.entity).set({ parent: b.id }).where(
      eq(schema.entity.id, c.id),
    );

    const updated = await db.select().from(schema.entityAncestors).where(
      eq(schema.entityAncestors.entityId, c.id),
    );
    expect(updated.map((a) => a.ancestorId).sort((a, b) => a - b)).toEqual(
      [b.id, c.id].sort((a, b) => a - b),
    );
  });

  test('Circular Dependency: should prevent circularity on update', async ({ db }) => {
    const [a] = await db
      .insert(schema.entity)
      .values({ entityType: 'area', name: 'A' })
      .returning();
    const [b] = await db
      .insert(schema.entity)
      .values({
        entityType: 'area',
        name: 'B',
        parent: a.id,
      })
      .returning();

    // Try to make A a child of B (A -> B -> A)
    try {
      await db.update(schema.entity).set({ parent: b.id }).where(
        eq(schema.entity.id, a.id),
      );
      expect.fail('Should have thrown an error');
    } catch (e: any) {
      const message = e.cause?.message || e.message;
      expect(message).toContain('Cyclic dependency detected');
    }
  });

  test('Delete: should remove entries from entity_ancestors', async ({ db }) => {
    const [a] = await db
      .insert(schema.entity)
      .values({ entityType: 'area', name: 'A' })
      .returning();

    const before = await db.select().from(schema.entityAncestors).where(
      eq(schema.entityAncestors.entityId, a.id),
    );
    expect(before).toHaveLength(1);

    await db.delete(schema.entity).where(eq(schema.entity.id, a.id));

    const after = await db.select().from(schema.entityAncestors).where(
      eq(schema.entityAncestors.entityId, a.id),
    );
    expect(after).toHaveLength(0);
  });

  test('Delete: should fail if entity has children (RESTRICT)', async ({ db }) => {
    const [a] = await db
      .insert(schema.entity)
      .values({ entityType: 'area', name: 'A' })
      .returning();
    await db.insert(schema.entity).values({
      entityType: 'area',
      name: 'B',
      parent: a.id,
    });

    await expect(db.delete(schema.entity).where(eq(schema.entity.id, a.id)))
      .rejects
      .toThrow();
  });

  test('Update: moving a parent updates descendant ancestors', async ({ db }) => {
    const [a] = await db
      .insert(schema.entity)
      .values({ entityType: 'area', name: 'A' })
      .returning();
    const [b] = await db
      .insert(schema.entity)
      .values({
        entityType: 'area',
        name: 'B',
        parent: a.id,
      })
      .returning();
    const [c] = await db
      .insert(schema.entity)
      .values({
        entityType: 'area',
        name: 'C',
        parent: b.id,
      })
      .returning();
    const [d] = await db
      .insert(schema.entity)
      .values({ entityType: 'area', name: 'D' })
      .returning();

    // Verify initial ancestors for C: [A, B, C]
    const initial = await db.select().from(schema.entityAncestors).where(
      eq(schema.entityAncestors.entityId, c.id),
    );
    expect(initial.map((a) => a.ancestorId).sort((a, b) => a - b)).toEqual(
      [a.id, b.id, c.id].sort((a, b) => a - b),
    );

    // Move B to D: D -> B -> C
    await db.update(schema.entity).set({ parent: d.id }).where(
      eq(schema.entity.id, b.id),
    );

    // Check C's ancestors.
    // If the triggers are correct, they should be [D, B, C]
    // If they only update the moved entity, they will stay [A, B, C] (WRONG) or maybe [B, C] if B's old records were deleted.
    const updated = await db.select().from(schema.entityAncestors).where(
      eq(schema.entityAncestors.entityId, c.id),
    );
    const updatedIds = updated.map((a) => a.ancestorId).sort((a, b) => a - b);

    // According to the current trigger implementation, this will likely FAIL if we expect [d.id, b.id, c.id]
    // because the trigger on 'entity' only runs for the row being updated (B).
    // It doesn't update C.
    expect(updatedIds).toEqual([d.id, b.id, c.id].sort((a, b) => a - b));
  });
});
