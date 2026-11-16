-- Administrator-only template, rendered by provision-prototype.mjs.
-- Product migrations stay in the parent directory. No objects use public.
CREATE ROLE {{ROLE}} LOGIN PASSWORD {{PASSWORD}}
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 5;
-- Supabase postgres is not a superuser: it needs membership to assign schema
-- ownership. Membership is one-way; the prototype does not inherit postgres.
GRANT {{ROLE}} TO postgres;
CREATE SCHEMA {{ROLE}} AUTHORIZATION {{ROLE}};
REVOKE ALL ON SCHEMA {{ROLE}} FROM PUBLIC;
ALTER ROLE {{ROLE}} SET search_path TO {{ROLE}};
ALTER ROLE {{ROLE}} SET statement_timeout TO '15s';
ALTER ROLE {{ROLE}} SET lock_timeout TO '5s';
ALTER ROLE {{ROLE}} SET idle_in_transaction_session_timeout TO '15s';
ALTER DEFAULT PRIVILEGES FOR ROLE {{ROLE}} REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Storage gets a separate role with no product-table access. Supabase Auth
-- places this administrator-assigned role in the technical account's JWT.
CREATE ROLE {{STORAGE_ROLE}} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT {{STORAGE_ROLE}} TO postgres, authenticator;
GRANT USAGE ON SCHEMA storage, auth TO {{STORAGE_ROLE}};
GRANT EXECUTE ON FUNCTION auth.uid() TO {{STORAGE_ROLE}};
GRANT SELECT ON storage.buckets TO {{STORAGE_ROLE}};
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO {{STORAGE_ROLE}};

-- Restrictive policies also protect against existing broad permissive policies.
-- They constrain both this bucket and this technical storage account.
CREATE POLICY {{OBJECT_GUARD}} ON storage.objects AS RESTRICTIVE FOR ALL TO PUBLIC
  USING ((bucket_id <> {{BUCKET}} AND (SELECT auth.uid()) IS DISTINCT FROM {{USER_ID}}::uuid)
    OR (bucket_id = {{BUCKET}} AND (SELECT auth.uid()) = {{USER_ID}}::uuid))
  WITH CHECK ((bucket_id <> {{BUCKET}} AND (SELECT auth.uid()) IS DISTINCT FROM {{USER_ID}}::uuid)
    OR (bucket_id = {{BUCKET}} AND (SELECT auth.uid()) = {{USER_ID}}::uuid));
CREATE POLICY {{OBJECT_ALLOW}} ON storage.objects FOR ALL TO {{STORAGE_ROLE}}
  USING (bucket_id = {{BUCKET}} AND (SELECT auth.uid()) = {{USER_ID}}::uuid)
  WITH CHECK (bucket_id = {{BUCKET}} AND (SELECT auth.uid()) = {{USER_ID}}::uuid);

CREATE POLICY {{BUCKET_GUARD}} ON storage.buckets AS RESTRICTIVE FOR SELECT TO PUBLIC
  USING ((id <> {{BUCKET}} AND (SELECT auth.uid()) IS DISTINCT FROM {{USER_ID}}::uuid)
    OR (id = {{BUCKET}} AND (SELECT auth.uid()) = {{USER_ID}}::uuid));
CREATE POLICY {{BUCKET_ALLOW}} ON storage.buckets FOR SELECT TO {{STORAGE_ROLE}}
  USING (id = {{BUCKET}} AND (SELECT auth.uid()) = {{USER_ID}}::uuid);
-- Participants can operate on files but cannot create/change/delete buckets.
CREATE POLICY {{BUCKET_INSERT_GUARD}} ON storage.buckets AS RESTRICTIVE FOR INSERT TO PUBLIC
  WITH CHECK (id <> {{BUCKET}} AND (SELECT auth.uid()) IS DISTINCT FROM {{USER_ID}}::uuid);
CREATE POLICY {{BUCKET_UPDATE_GUARD}} ON storage.buckets AS RESTRICTIVE FOR UPDATE TO PUBLIC
  USING (id <> {{BUCKET}} AND (SELECT auth.uid()) IS DISTINCT FROM {{USER_ID}}::uuid)
  WITH CHECK (id <> {{BUCKET}} AND (SELECT auth.uid()) IS DISTINCT FROM {{USER_ID}}::uuid);
CREATE POLICY {{BUCKET_DELETE_GUARD}} ON storage.buckets AS RESTRICTIVE FOR DELETE TO PUBLIC
  USING (id <> {{BUCKET}} AND (SELECT auth.uid()) IS DISTINCT FROM {{USER_ID}}::uuid);
