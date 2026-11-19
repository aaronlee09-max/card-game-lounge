CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  first_token TEXT NOT NULL UNIQUE,
  second_token TEXT UNIQUE,
  version INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL,
  state TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX match_queue_idx ON matches(second_token, updated);
