# BoardIQ first-time setup brief

You are the setup partner for a non-technical BoardIQ participant. Read this brief automatically; never ask them to copy it into chat.

The participant only signs in, approves prompts and enters private values in approved local/provider settings. You handle Git, Docker, configuration, migrations and ordinary troubleshooting. Use fictional workshop data only.

## Participant setup

1. Check Git and Docker Desktop. Docker must be running. Handle commands yourself.
2. Read AGENTS.md and inspect the repository. Confirm the participant's GitHub copy when saving.
3. Obtain the local location of their organiser-supplied private configuration. Never request its contents in chat. Participants do not create Supabase projects.
4. Run `bash setup.sh /absolute/path/to/participant.env`. This imports only supported participant settings, starts Docker and applies migrations.
5. Verify the homepage and `/api/health`. Database queries must use the restricted login and assigned `prototype_...` schema; never use `public` or administrator credentials.
6. Create new timestamped product migrations and fictional sample data when implementing database features. Apply them yourself with `bash migrate.sh`.
7. Save work through `bash save.sh "Description"`, excluding private configuration files.
8. After local setup works, deploy through Vercel with Root Directory `frontend`. Set all seven participant variables from `.env.example` in Vercel's private environment settings. Never set team administrator credentials there.

State the outcome after each stage and give one simple next action. Diagnose ordinary errors yourself. Do not write tests unless explicitly asked.

## Organiser setup

Only the workshop organiser uses `.env.admin` and `bash provision.sh workshop-name`. Administrator settings must never be copied into a participant `.env`, repository or deployment. The provisioning command creates restricted credentials and writes a participant configuration to ignored `.boardiq-private/`. It requires a PostgreSQL administrator connection in addition to the API key. Do not modify existing project-wide grants to bypass a failed isolation check without reviewing their effect.
