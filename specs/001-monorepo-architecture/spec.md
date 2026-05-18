# Feature Specification: Base Monorepo Architecture

**Feature Branch**: `001-monorepo-architecture`

**Created**: 2026-05-17

**Status**: Draft

**Input**: User description: "Arquitetura base dos serviços de backend e frontend. A ideia é manter tanto backend como frontend no mesmo projeto com a divisão interna como se fossem projetos separados."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New Developer Onboarding (Priority: P1)

A developer who has just cloned the repository must be able to install all
dependencies and bring both services up with the minimum number of commands
from the project root. They should not need to navigate into sub-directories
or run service-specific setup steps manually.

**Why this priority**: If onboarding is painful, every new team member wastes
time and may misconfigure their environment. Getting this right first makes
everything else easier.

**Independent Test**: Clone the repository into a clean directory. From the
project root, run the documented setup command(s). Both backend and frontend
services must become available and respond correctly — independently of any
other user story being implemented.

**Acceptance Scenarios**:

1. **Given** a clean machine with the required runtime installed,
   **When** a developer runs the root-level install command,
   **Then** all backend and frontend dependencies are installed without
   requiring any manual step inside individual service directories.

2. **Given** all dependencies are installed,
   **When** a developer runs the root-level start command,
   **Then** both backend and frontend services start and are accessible.

3. **Given** both services are running,
   **When** one service is stopped,
   **Then** the other service continues to run without interruption.

---

### User Story 2 - Independent Service Development (Priority: P2)

A developer working exclusively on the backend must be able to start, test,
and build only the backend service without starting the frontend, and vice
versa. Each service must be runnable in isolation with its own commands.

**Why this priority**: Teams frequently have members specializing in one layer.
Forcing them to run both services wastes resources and adds noise.

**Independent Test**: From the backend service directory, run the service start
command. Only the backend should start. No frontend dependencies or processes
should be required. Repeat symmetrically for the frontend.

**Acceptance Scenarios**:

1. **Given** the project is installed,
   **When** a developer starts only the backend service,
   **Then** the backend runs and accepts requests without the frontend being
   started.

2. **Given** the project is installed,
   **When** a developer starts only the frontend service,
   **Then** the frontend starts without requiring the backend to be running.

3. **Given** only the backend is running,
   **When** a developer runs the backend test suite,
   **Then** all backend tests execute and report results without any frontend
   dependency.

4. **Given** only the frontend is running,
   **When** a developer runs the frontend test suite,
   **Then** all frontend tests execute and report results without any backend
   dependency.

---

### User Story 3 - Consistent Code Quality Enforcement (Priority: P3)

A developer must be able to run linting and formatting checks across the
entire project — both backend and frontend — from the project root. The
same quality rules must apply to both services, and violations must be
reported before code is committed.

**Why this priority**: Code consistency across services reduces cognitive
overhead when switching between layers. Automated enforcement prevents style
drift over time.

**Independent Test**: Introduce a deliberate style violation in each service.
From the project root, run the lint command. The violation in both services
must be detected and reported. Fix both violations and re-run; no errors
should be reported.

**Acceptance Scenarios**:

1. **Given** a style violation exists in the backend code,
   **When** the root-level lint command is run,
   **Then** the violation is reported with its file path and description.

2. **Given** a style violation exists in the frontend code,
   **When** the root-level lint command is run,
   **Then** the violation is reported with its file path and description.

3. **Given** a developer attempts to commit code with a style violation,
   **Then** the commit is blocked and the violation is reported before the
   commit completes.

4. **Given** all code passes lint rules,
   **When** the format command is run from the root,
   **Then** code in both services is formatted consistently and no errors
   are reported.

---

### Edge Cases

- What happens when a developer installs dependencies only for one service
  and then attempts to run root-level commands that target both?
- **When a service starts with one or more required environment variables
  missing, it MUST fail immediately and print a clear error listing every
  missing variable by name before any initialization logic runs.**
- **When both services are configured to the same port, the second service
  to start MUST fail immediately with an explicit "port already in use"
  message that names the conflicting port number, rather than surfacing a
  raw OS-level bind error.**

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST be organized into two top-level service
  directories — one for the backend and one for the frontend — each
  self-contained with its own dependency manifest and configuration.

- **FR-002**: Each service directory MUST be independently installable,
  startable, testable, and buildable without requiring the other service
  to be present or running.

- **FR-003**: The project root MUST provide commands that orchestrate both
  services together (install all, start all, test all, lint all).

- **FR-004**: Both services MUST share the same code style rules (formatting
  and linting), defined once at the project root and enforced uniformly
  across both services.

- **FR-005**: Code style violations MUST be automatically checked and
  reported before a commit is accepted (pre-commit enforcement).

- **FR-006**: Each service MUST define its own environment configuration
  separately; the root level MUST document which variables are required
  by each service.

- **FR-009**: Each service MUST perform a startup environment check and
  fail immediately — before any initialization — if any required
  environment variable is absent, printing the name of every missing
  variable in the error output.

- **FR-010**: If a service attempts to bind to a port that is already in
  use, it MUST fail immediately with a human-readable error that explicitly
  names the conflicting port number.

- **FR-011**: When both services run simultaneously via the root-level start
  command, every log line MUST be prefixed with the originating service name
  (e.g., `[backend]` or `[frontend]`) so developers can distinguish output
  from each service in a shared terminal.

- **FR-007**: The project MUST include a root-level README documenting:
  how to install, how to start each service independently, how to start
  both together, how to run tests, and the required environment variables
  for each service.

- **FR-008**: Both services MUST produce isolated build artifacts that can
  be deployed independently of one another.

### Key Entities

- **Backend service**: The server-side application; owns its own dependencies,
  configuration, source code, tests, and build output.

- **Frontend service**: The client-side application; owns its own dependencies,
  configuration, source code, tests, and build output.

- **Root workspace**: The shared entry point that links both services,
  providing unified commands for install, start, test, lint, and format.

- **Shared configuration**: Code style and formatting rules defined once at
  the root and referenced (not duplicated) by both services.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can clone the repository and have both services
  running locally in under 5 minutes by following only the README instructions.

- **SC-002**: Each service can be started, tested, and built independently
  without any step requiring the other service to be present or running.

- **SC-003**: A deliberate style violation introduced in either service is
  automatically detected and reported before the offending code is committed.

- **SC-004**: Root-level install, start, test, lint, and format commands
  complete successfully and target both services without requiring the
  developer to navigate into individual service directories.

- **SC-005**: Both services produce separate, independently deployable build
  artifacts with no shared output directory.

- **SC-006**: When both services run together, a developer can identify
  which service produced any given log line without additional tooling.

## Clarifications

### Session 2026-05-17

- Q: When a service starts with required environment variables missing, what should happen? → A: Fail immediately with a clear error listing every missing required variable.
- Q: If both services are configured to the same port, how should the conflict be surfaced? → A: The second service to start fails immediately with an explicit "port already in use" message naming the conflicting port.
- Q: When both services run simultaneously, how should their log output be differentiated? → A: Each log line is prefixed with the service name (e.g., `[backend]` / `[frontend]`).

## Assumptions

- The project uses a package manager that supports workspaces natively,
  enabling root-level commands that delegate to each service.
- Each service will use its own environment file pattern; no environment
  variables are shared at the root level between services.
- Port conflicts are avoided by convention: backend and frontend use
  different default ports, both documented in the README and overridable
  via environment variables.
- CI/CD pipeline configuration is out of scope for this feature; this spec
  covers the local developer experience only.
- The shared code quality configuration covers both type-checking strictness
  and code formatting rules.
- Shared business logic or utility code between services is out of scope for
  this feature and will be addressed in a dedicated future feature.
