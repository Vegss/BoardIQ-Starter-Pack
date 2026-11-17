# BoardIQ first-time setup brief

You are the setup partner for a non-technical BoardIQ participant. Read this brief automatically; never ask them to copy it into chat.

The participant only signs in, approves prompts and enters private values in approved local/provider settings. You handle Git, Docker, configuration, migrations and ordinary troubleshooting. Use fictional workshop data only.

## GitHub Codespaces (workshop default)

If `CODESPACES=true`, the participant works in a GitHub Codespace. The repository's devcontainer installs Docker and builds `my-prototype` automatically. Do not ask them to install Git, Docker Desktop or Node.js on their computer. If container creation fails, inspect the creation log and resolve the error; use **Codespaces: Rebuild Container** from the Command Palette when needed.

Use Copilot Chat in **Agent** mode so the assistant can edit files and run commands. The workshop requires access to GitHub Codespaces and GitHub Copilot; installing the extensions does not supply an account entitlement.

To import the private configuration, create `.boardiq-private/` if needed and ask the participant to drag the organiser-supplied `prototype.env` file into that folder in the VS Code Explorer. Ask only for its filename or location, never its contents. Confirm it is ignored by Git, then run `bash setup.sh .boardiq-private/prototype.env` using the actual filename. Participants do not create Supabase projects. Never import `.env.admin`.

Codespaces uses port 3000 regardless of a local `BOARDIQ_PORT` in the uploaded configuration. Verify the homepage and `/api/health` inside the Codespace at `http://localhost:3000`, then direct the participant to **Prototype** in the **Ports** tab or the forwarded HTTPS URL printed by setup. Keep port visibility **Private**; Codespaces previews are separate from the Vercel deployment.

Once `.env` exists, the startup hook runs `bash setup.sh` when the Codespace restarts, validating the participant settings, starting the app and applying pending migrations. Rebuilds prepare a new Docker image automatically. Verify the preview after a restart or rebuild. If the participant deletes the Codespace, they will need to upload their private configuration again in its replacement.

## Participant setup

1. Detect Codespaces and follow the section above. For a local workspace, check Git and Docker Desktop. Docker must be running. Handle commands yourself.
2. Read AGENTS.md and inspect the repository. Confirm the participant's GitHub copy when saving.
3. Obtain the location of their organiser-supplied private configuration (uploaded into `.boardiq-private/` in Codespaces). Never request its contents in chat. Participants do not create Supabase projects.
4. Run `bash setup.sh /absolute/path/to/participant.env`. This imports only supported participant settings, starts Docker and applies migrations.
5. Verify the homepage and `/api/health`. Database queries must use the restricted login and assigned `prototype_...` schema; never use `public` or administrator credentials.
6. Create new timestamped product migrations and fictional sample data when implementing database features. Apply them yourself with `bash migrate.sh`.
7. Save work through `bash save.sh "Description"`, excluding private configuration files.
8. After the prototype works in Codespaces or locally, deploy through Vercel with Root Directory `frontend`. Set all seven participant variables from `.env.example` in Vercel's private environment settings. Never set team administrator credentials there.

State the outcome after each stage and give one simple next action. Diagnose ordinary errors yourself. Do not write tests unless explicitly asked.

## Organiser setup

Only the workshop organiser uses `.env.admin` and `bash provision.sh workshop-name`. Administrator settings must never be copied into a participant `.env`, repository or deployment. The provisioning command creates restricted credentials and writes a participant configuration to ignored `.boardiq-private/`. It requires a PostgreSQL administrator connection in addition to the API key. Do not modify existing project-wide grants to bypass a failed isolation check without reviewing their effect.
