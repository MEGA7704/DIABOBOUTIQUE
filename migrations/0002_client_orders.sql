CREATE TABLE IF NOT EXISTS gg_client_state(uid TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0, profile TEXT NOT NULL DEFAULT '{}', delivery TEXT NOT NULL DEFAULT '{}', cart TEXT NOT NULL DEFAULT '{}', favorites TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS gg_orders(id TEXT PRIMARY KEY, checkout TEXT NOT NULL, uid TEXT NOT NULL, shop TEXT NOT NULL, shop_name TEXT NOT NULL, lines TEXT NOT NULL, total INTEGER NOT NULL CHECK(total>=0), delivery TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','paid')), created INTEGER NOT NULL, updated INTEGER NOT NULL, payment_method TEXT, payment_ref TEXT, settlement TEXT UNIQUE, UNIQUE(checkout,shop));
CREATE INDEX IF NOT EXISTS gg_orders_client ON gg_orders(uid,created);
CREATE INDEX IF NOT EXISTS gg_orders_shop ON gg_orders(shop,created);
CREATE UNIQUE INDEX IF NOT EXISTS gg_orders_payment_ref ON gg_orders(shop,payment_ref) WHERE payment_ref IS NOT NULL;
