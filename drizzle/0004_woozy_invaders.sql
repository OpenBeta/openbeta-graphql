CREATE TABLE "entity_ancestors" (
	"entity_id" integer NOT NULL,
	"ancestor_id" integer NOT NULL,
	CONSTRAINT "entity_ancestors_entity_id_ancestor_id_pk" PRIMARY KEY("entity_id","ancestor_id")
);

CREATE OR REPLACE FUNCTION entity_insert_ancestors()
RETURNS TRIGGER AS $$
DECLARE
    v_is_cycle BOOLEAN;
BEGIN
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
    INSERT INTO entity_ancestors (entity_id, ancestor_id)
    SELECT NEW.id, id
    FROM ancestor
    WHERE NOT is_cycle
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for inserting ancestors
CREATE TRIGGER entity_insert_trigger
AFTER INSERT ON entity
FOR EACH ROW
EXECUTE FUNCTION entity_insert_ancestors();

-- Create the trigger function for updating ancestors
CREATE OR REPLACE FUNCTION entity_update_ancestors()
RETURNS TRIGGER AS $$
DECLARE
    v_is_cycle BOOLEAN;
BEGIN
    -- Delete old ancestor relationships
    DELETE FROM entity_ancestors WHERE entity_id = NEW.id;

    -- Insert new ancestor relationships
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
    INSERT INTO entity_ancestors (entity_id, ancestor_id)
    SELECT NEW.id, id
    FROM ancestor
    WHERE NOT is_cycle
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for updating ancestors
CREATE TRIGGER entity_update_trigger
AFTER UPDATE ON entity
FOR EACH ROW
WHEN (OLD.parent IS DISTINCT FROM NEW.parent)
EXECUTE FUNCTION entity_update_ancestors();

-- Create the trigger function for deleting ancestors
CREATE OR REPLACE FUNCTION entity_delete_ancestors()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete ancestor relationships for the deleted entity
    DELETE FROM entity_ancestors WHERE entity_id = OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for deleting ancestors
CREATE TRIGGER entity_delete_trigger
BEFORE DELETE ON entity
FOR EACH ROW
EXECUTE FUNCTION entity_delete_ancestors();
