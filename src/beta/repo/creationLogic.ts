import { Database, entity, EntityKind, Transaction } from '@schema';
import * as schema from '@schema';
import { EntityCompBaseTable } from 'db/schema/entitiy';
import {
  getTableColumns,
  type InferInsertModel,
  sql,
  SQLChunk,
} from 'drizzle-orm';
import { Actor } from '../actor';
import { EntityId, EntityIdentifiable, EntityRecord } from '../entity_model';

export async function createEntity<
  EntCreation extends
    & Record<string, unknown>
    & Omit<InferInsertModel<Table>, 'id'>
    & Partial<InferInsertModel<typeof entity>>,
  Table extends EntityCompBaseTable,
>(
  db: Database | Transaction,
  table: Table,
  kind: EntityKind,
  actor: Actor,
  data: EntCreation,
): Promise<EntityId> {
  // if there were any constraints you wanted to check here that are infeasible for
  // our sql engine they could go nicely here in your subclassing.
  const columns: SQLChunk[] = [];
  const values: SQLChunk[] = [];
  const entityColumns = [
    entity.entityType,
    entity.name,
    entity.parent,
  ]
    .map((
      col,
    ) => sql.identifier(col.name));

  columns.push(sql.identifier(table.id.name));
  values.push(sql`"reify_entity"."id"`);

  const tableColumns = getTableColumns(table);

  for (const columnKey in tableColumns) {
    if (columnKey in data && data[columnKey] !== undefined) {
      // @ts-ignore
      const colName = tableColumns[columnKey].name;
      columns.push(sql.identifier(colName));

      const val = data[columnKey] as any;
      if (
        colName === 'position'
        && typeof val === 'object'
        && val !== null
        && 'x' in val
        && 'y' in val
      ) {
        values.push(
          sql`${
            JSON.stringify({ type: 'Point', coordinates: [val.x, val.y] })
          }`,
        );
      } else {
        values.push(sql`${val}`);
      }
    }
  }

  if (data.parent === undefined || data.parent === null) {
    throw new Error(
      'For now, we are assuming that entities must have parents',
    );
  }

  const query = sql`
      with reify_entity as (
        insert into "entity" ${entityColumns}
        values (${kind}, ${data.name}, ${data.parent})
        returning id
      ),
      insert_extra as (insert into ${table} ${columns}
      select ${sql.join(values, sql`, `)} from "reify_entity"
      )
      select * from reify_entity
    `;

  let reified = await db.execute<Pick<EntityIdentifiable, 'id'>>(query);

  return reified.rows[0].id as EntityId;
}
