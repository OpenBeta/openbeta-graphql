-- Update the trigger function for updating ancestors to handle descendants
-- When an entity's parent changes, we need to rebuild the ancestor list 
-- for the entity itself AND all of its descendants.

CREATE OR REPLACE FUNCTION entity_update_ancestors()
RETURNS TRIGGER AS $$
DECLARE
    v_is_cycle BOOLEAN;
BEGIN
    -- 1. Check for cycles before proceeding
    WITH RECURSIVE ancestor AS (
        SELECT e.id, e.parent
        FROM entity e
        WHERE id = NEW.id
        UNION ALL
        SELECT e.id, e.parent
        FROM entity e
        INNER JOIN ancestor a ON e.id = a.parent
    )
    CYCLE id SET is_cycle TO true DEFAULT false USING path
    SELECT EXISTS(SELECT 1 FROM ancestor WHERE is_cycle) INTO v_is_cycle;

    IF v_is_cycle THEN
        RAISE EXCEPTION 'Cyclic dependency detected for entity %', NEW.id;
    END IF;

    -- 2. Delete ancestor relationships for the entity and all its descendants
    WITH RECURSIVE descendant AS (
        SELECT id FROM entity WHERE id = NEW.id
        UNION ALL
        SELECT e.id FROM entity e INNER JOIN descendant d ON e.parent = d.id
    )
    DELETE FROM entity_ancestors WHERE entity_id IN (SELECT id FROM descendant);

    -- 3. Re-populate ancestor relationships for the entity and all its descendants
    WITH RECURSIVE descendant AS (
        SELECT id, parent FROM entity WHERE id = NEW.id
        UNION ALL
        SELECT e.id, e.parent FROM entity e INNER JOIN descendant d ON e.parent = d.id
    ),
    hierarchy AS (
        -- Base case: every descendant is its own ancestor
        SELECT id as entity_id, id as ancestor_id, parent FROM descendant
        UNION ALL
        -- Recursive case: join with the entity table to find ancestors up the tree
        SELECT h.entity_id, e.id as ancestor_id, e.parent
        FROM hierarchy h
        JOIN entity e ON h.parent = e.id
    )
    INSERT INTO entity_ancestors (entity_id, ancestor_id)
    SELECT entity_id, ancestor_id
    FROM hierarchy
    WHERE ancestor_id IS NOT NULL
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
