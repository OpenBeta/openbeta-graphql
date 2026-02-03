import { Database, entity, EntityKind } from '@schema';
import { EntityId, EntityIdentifiable } from 'beta/entity_model';
import { and, BinaryOperator, eq, not, SQL, sql, SQLChunk } from 'drizzle-orm';
import { UUIDTypes } from 'uuid';

export function ancestors(dn: Database, of: EntityId) {
  return sql`
    WITH RECURSIVE ancestry AS (
        SELECT id, uuid, parent, name, 0 as depth
        FROM ${entity}
        WHERE id = ${of}

        UNION ALL

        SELECT t.id, t.uuid, t.parent, t.name, a.depth + 1
        FROM ${entity} t
        INNER JOIN ancestry a ON t.id = a.parent
    )
    SELECT id, uuid, parent, name 
    FROM ancestry 
    ORDER BY depth DESC;
  `;
}
