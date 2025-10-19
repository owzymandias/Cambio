<!--
Sync Impact Report:
Version: 1.0.0 (Initial constitution)
Modified Principles: N/A (first version)
Added Sections: All (initial creation)
Removed Sections: N/A
Templates Status:
  ✅ plan-template.md - reviewed, constitution check section aligned
  ✅ spec-template.md - reviewed, requirements align with principles
  ✅ tasks-template.md - reviewed, task organization matches governance
Follow-up TODOs: None
-->

# Cambio Constitution

## Core Principles

### I. Real-Time Multiplayer First

All game features MUST be designed for real-time synchronization from the start. Every gameplay interaction, card action, and state change must support multiple concurrent players with immediate visual feedback. The system MUST handle both human players and AI bots seamlessly within the same game session.

**Rationale**: Cambio is inherently a multiplayer card game. Retrofitting multiplayer support is costly and error-prone. Building it in from day one ensures consistent architecture and prevents technical debt.

### II. Server-Authoritative Game Logic (NON-NEGOTIABLE)

All game state, rule enforcement, and card mechanics MUST execute on the server. Clients are presentation layers only - they display state and send player intentions, never make authoritative decisions. No game logic may be duplicated in client code except for optimistic UI previews, which the server must validate.

**Rationale**: Server authority prevents cheating, ensures fair play, and provides a single source of truth for game state. This is critical for competitive online card games where players must trust the system.

### III. Mobile-Responsive Touch-First Design

All UI components, game boards, and interactions MUST work seamlessly on mobile devices with touch inputs. Design for small screens first, then enhance for desktop. Touch targets must be minimum 44x44px. No hover-dependent interactions allowed.

**Rationale**: Card games are naturally suited to mobile play. A mobile-first approach ensures the widest possible audience and best user experience across all devices.

### IV. Minimal Viable Testing Strategy

Testing MUST focus on game rule logic, server-authoritative validations, and critical game flow paths. Comprehensive test coverage is NOT required for UI components or non-critical features. Manual QA is acceptable for visual and UX validation.

**Focus areas requiring tests**:
- Card game rules and win conditions
- Server validation of player moves
- Game state transitions (start, turn, end)
- Bot AI decision logic
- Critical API contracts for game actions

**Rationale**: As a small game project, testing overhead must be balanced with development velocity. Test what matters most: game correctness and fairness.

### V. TypeScript Type Safety & Runtime Validation

Strong TypeScript typing is REQUIRED throughout the codebase. No `any` types except when interfacing with untyped libraries (must be documented). All client-server communication MUST include runtime validation using Zod or similar. Game state objects must have explicit type definitions.

**Rationale**: Card games have complex state and rule interactions. Type safety catches bugs at compile time. Runtime validation prevents malformed data from corrupting game state.

## Technology Stack Requirements

**Framework**: Nuxt 4 (Vue 3 + TypeScript) for full-stack development
**Database**: PostgreSQL with Drizzle ORM for game state persistence
**Real-time Communication**: WebSockets or Server-Sent Events for live game updates
**Authentication**: Better Auth (inherited from NuxSaaS base) for user accounts
**Deployment**: Node.js server or Cloudflare Workers (inherited from base)

**Game-Specific Requirements**:
- Real-time event system for broadcasting game actions to all players
- Session management for active game rooms
- Bot AI system for single-player and practice modes
- Reconnection handling for dropped connections during gameplay

## Development Workflow

### Feature Development Process

1. **Specification First**: All features start with a spec.md defining user stories, game rules, and acceptance criteria
2. **Plan Before Code**: Generate implementation plan with technical approach and file structure
3. **Incremental Delivery**: Build features as independently testable user stories (MVP approach)
4. **Server Logic First**: Implement and validate server-side game rules before client UI

### Quality Gates

- **Code Review**: All PRs require review for game logic correctness and type safety
- **Rule Validation**: Game rule implementations must match spec acceptance criteria
- **Mobile Testing**: New UI features must be manually tested on mobile viewport
- **No Broken Main**: Main branch must always have working game functionality

### Game Design Iteration

- Game rules and mechanics may evolve based on playtesting
- Constitution principles (server-authority, mobile-first, real-time) are immutable
- Feature specs can be amended after user feedback, with version tracking

## Governance

**Constitution Authority**: This constitution supersedes all other development practices. Any deviation from core principles (I-V) requires explicit justification documented in the implementation plan's Complexity Tracking section.

**Amendment Process**:
1. Propose amendment with rationale and impact analysis
2. Update constitution version following semantic versioning:
   - MAJOR: Principle removal or fundamental redefinition
   - MINOR: New principle added or material expansion
   - PATCH: Clarifications, wording fixes, non-semantic changes
3. Sync all dependent templates (plan, spec, tasks) with changes
4. Document migration path if existing code affected

**Compliance Review**: All PRs and specs must verify alignment with:
- Server-authoritative principle (no client-side game logic)
- Real-time multiplayer support (no single-player-only features)
- Mobile-responsive design (no desktop-only UI patterns)
- Type safety requirements (no unvalidated boundaries)

**Simplicity Requirement**: New complexity (additional services, libraries, architectural patterns) must be justified in plan.md Complexity Tracking table. Prefer simple solutions over "scalable" ones until scale is needed.

**Version**: 1.0.0 | **Ratified**: 2025-10-19 | **Last Amended**: 2025-10-19
