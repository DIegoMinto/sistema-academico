CREATE TABLE IF NOT EXISTS sesiones (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS sesiones_expire_idx
ON sesiones (expire);