-- Profit.com Academy · certificates (PostgreSQL).
-- One row per certificate. Issued by the server in the same transaction that records the path as finished
-- (POST /academy/paths/:id/finish, see API.md); never by the client. Read publicly by ID only
-- (GET /academy/certificates/:id). The holder's name is a snapshot taken at issue time: a later rename does not
-- change a certificate already issued.
--
-- id: the printed form, uppercase with dashes: PREFIX-XXXX-XXXX (PREFIX per path, catalog.json certPrefix:
-- TF, TA, RM, UC, IE, MN, PM, OE, CT; X from 23456789ABCDEFGHJKMNPQRSTUVWXYZ, no 0/O/1/I/L).
-- id_key: the lookup key, the ID without dashes (what a lookup normalizes any input to). Unique.

BEGIN;

CREATE TABLE IF NOT EXISTS certificates (
    id            text        PRIMARY KEY
                              CHECK (id ~ '^[A-Z]{2,4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$'),
    id_key        text        GENERATED ALWAYS AS (replace(id, '-', '')) STORED,
    user_id       text        NOT NULL,              -- Profit.com account id
    name_snapshot text        NOT NULL CHECK (length(btrim(name_snapshot)) > 0),
    path          text        NOT NULL,              -- path id, e.g. 'learn-to-trade'
    issued_at     timestamptz NOT NULL DEFAULT now()
);

-- exact lookup on the canonical form (input: trim, uppercase, strip spaces and dashes)
CREATE UNIQUE INDEX IF NOT EXISTS certificates_id_key_uq ON certificates (id_key);
-- one certificate per learner and path (finishing again never issues a second one)
CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_path_uq ON certificates (user_id, path);
-- "my certificates" (certificates page, profile)
CREATE INDEX IF NOT EXISTS certificates_user_id_idx ON certificates (user_id);

COMMIT;
