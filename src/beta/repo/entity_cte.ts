import { Database, entity, EntityKind } from '@schema';
import { EntityId, EntityIdentifiable } from 'beta/entity_model';
import { and, BinaryOperator, eq, not, SQL, sql, SQLChunk } from 'drizzle-orm';

function baseDescendantsCte(anchorId: EntityId) {
  return sql`
        RECURSIVE descendants AS (
          SELECT id, parent, name, entityType
          FROM ${entity}
          WHERE id = ${anchorId}

          UNION ALL

          -- Recursive member
          SELECT t.id, t.parent, t.name, t.entityType
          FROM ${entity} t
          INNER JOIN descendants d ON t.parent = d.id
          WHERE NOT t.deleted
        )
    )    `;
}

/**
Because entities are organised in their root table it is easy
to get a flat list of descendants.
*/
export function descendants(
  db: Database,
  of: EntityId,
  entityType?: EntityKind,
) {
  const chunks: SQL[] = [];

  if (entityType) {
    chunks.push(eq(sql.identifier(entity.entityType.name), entityType));
  }
  return sql`
      WITH RECURSIVE descendants AS (
        SELECT id, parent, name, entityType
        FROM ${entity}
        WHERE id = ${of}

        UNION ALL

        -- Recursive member
        SELECT t.id, t.parent, t.name, t.entityType
        FROM ${entity} t
        INNER JOIN descendants d ON t.parent = d.id
        WHERE NOT t.deleted
    )
    CYCLE id SET is_cycle USING path
    SELECT * FROM descendants  
    WHERE ${and(...chunks)} AND NOT is_cycle;
    `;
}

export async function ancestors(dn: Database, of: EntityId) {
  return sql`
    WITH RECURSIVE ancestry AS (
        --  Start with the specific leaf node
        SELECT id, parent, name, 0 as depth
        FROM ${entity}
        WHERE id = ${of}

        UNION ALL

        -- Join current row's parent_id to the table's id
        SELECT t.id, t.parent, t.name, a.depth + 1
        FROM categories t
        INNER JOIN ancestry a ON t.id = a.parent
    )
    CYCLE id SET is_cycle USING path
    SELECT id, parent_id, name 
    FROM ancestry 
    ORDER BY depth DESC;
  `;
}

export function countDescendants(
  db: Database,
  of: EntityId,
  entityType?: EntityKind,
): SQL<{ count: number }> {
  const chunks: SQL[] = [];

  if (entityType) {
    chunks.push(eq(sql.identifier(entity.entityType.name), entityType));
  }

  return sql`
    WITH RECURSIVE descendants AS (
        SELECT id, parent, entityType
        FROM ${entity}
        WHERE id = ${of}

        UNION ALL

        SELECT t.id, t.parent, t.entityType
        FROM ${entity} t
        INNER JOIN descendants d ON t.parent = d.id
        WHERE NOT t.deleted
    )
    CYCLE id SET is_cycle USING path
    SELECT count(*) as count
    FROM descendants
    WHERE ${and(...chunks)} AND NOT is_cycle;
    `;
}
