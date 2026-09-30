// Tests must never see a real database; DB-mode tests set a fake URL themselves.
delete process.env.DATABASE_URL;
