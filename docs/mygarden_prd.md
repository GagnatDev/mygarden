# PRD: MyGarden — Garden Overview App

## 1. Purpose

MyGarden gives hobby gardeners a simple, visual way to plan, organize, and track their garden throughout the growing season. It combines a spatial garden map, a planting and sowing planner, activity logging, a task calendar, and multi-season history — all in one place.

The app is designed for the Norwegian market first but built with internationalization from day one.

---

## 2. Target Group

- Hobby gardeners in Norway
- People with kitchen gardens, raised beds (pallekarmer), or smaller residential gardens
- Users who want structure and overview without complex spreadsheets or paper notes
- Households where two or more people manage a garden together

---

## 3. Problem

Hobby gardeners today lack:

- A clear overview of what is planted where in their garden
- Structure around sowing, planting, and harvesting timelines
- History from previous seasons to inform crop rotation and learning
- An easy way to combine a visual garden plan with a calendar
- A shared workspace when multiple people tend the same garden

Most existing tools are either too complex (farm-scale software) or too simple (plain notes).

---

## 4. Solution

A progressive web app (PWA) that combines:

- A visual, grid-based garden map
- A planting and sowing planner tied to garden areas
- Activity logging (sowing, planting, watering, harvesting, etc.)
- A calendar with upcoming tasks derived from the plan
- Multi-season history with comparison
- Collaborative gardens shared between user accounts

---

## 5. Platform & Technology

### 5.1 Application Stack

| Aspect | Decision |
|---|---|
| **Platform** | Web application, delivered as a PWA |
| **Frontend** | React with TypeScript |
| **Backend** | Node.js (v24) with TypeScript |
| **Auth** | User accounts (email/password at minimum; social login as future option) |
| **Data sync** | Cloud-synced; data persisted server-side |
| **Offline support** | Service worker caching for offline use; local changes sync when connectivity returns |
| **i18n** | Norwegian Bokmål (nb) as primary language; English (en) supported from launch |
| **Future native apps** | The PWA-first approach keeps the door open for wrapping in a native shell (Capacitor/similar) for iOS and Android distribution later |

### 5.2 Infrastructure & Deployment

| Aspect | Decision |
|---|---|
| **Distribution** | Docker image (single container packaging both frontend and backend) |
| **Hosting** | [Scaleway Serverless Containers](https://www.scaleway.com/en/docs/serverless-containers/) initially; migrate to [Scaleway Kubernetes (Kapsule)](https://www.scaleway.com/en/docs/containers/kubernetes/) when scale or operational needs justify it |
| **Database** | [Scaleway Managed MongoDB](https://www.scaleway.com/en/docs/managed-mongodb-databases/) — document-oriented model is a natural fit for garden/area/plant data which is hierarchical and varies per user; simpler and more cost-effective at small scale than relational alternatives |
| **File storage** | [Scaleway Object Storage](https://www.scaleway.com/en/docs/object-storage/) (S3-compatible) for user-uploaded images and documents (plant photos, garden photos, attachments); uploads proxied through the backend for access control and validation |
| **Container registry** | [Scaleway Container Registry](https://www.scaleway.com/en/docs/containers/container-registry/) |
| **CI/CD** | GitHub Actions — builds Docker image, pushes to Scaleway Container Registry, triggers deployment to Serverless Containers |

**Why MongoDB over PostgreSQL?**

The application's core data — gardens, areas, plantings, logs, plant profiles — is naturally hierarchical and document-shaped. A garden contains areas, each area contains plantings, each planting has logs and notes. MongoDB's flexible document model maps well to this structure without requiring complex joins or schema migrations as plant profile fields evolve. For a small-to-medium user base, Scaleway's Managed MongoDB offering is expected to be simpler to operate and more cost-effective than Managed PostgreSQL.

**Abstract data access layer**

All database and storage operations must go through an abstract repository/service layer (e.g., repository pattern) rather than calling MongoDB or S3 APIs directly from route handlers. This serves two purposes: (1) it enables future migration to a different database (e.g., PostgreSQL) or storage backend without rewriting business logic, and (2) it makes the application easier to test with in-memory or mock implementations.

### 5.3 Repository Conventions

All code, comments, commit messages, and documentation in this repository are written in English.

---

## 6. Core Features

### 6.1 Garden Map (Visual Overview)

**MVP approach:** A grid-based editor where the user places and labels rectangular areas on a top-down grid. Each cell or group of cells represents a garden area.

- Create a garden with a configurable grid size (e.g., 10×12 meters)
- Place rectangular areas on the grid:
  - Raised beds (pallekarmer)
  - Open beds
  - Tree / shrub zones
  - Paths, lawn, or other non-plantable zones
- Label and color-code each area
- Tap/click an area to see its detail view (what's planted, logs, notes)

**Post-MVP enhancements:**
- Freeform shapes and curved beds
- Drag-and-drop repositioning
- Snap-to-grid and alignment helpers
- Background image upload (e.g., a satellite photo) as a tracing guide

### 6.2 Layers

Toggle visibility of information overlays on the map:

- **Area type** — kitchen garden, flowers, shrubs/trees (color-coded)
- **Plan vs. actual** — show what was planned to be planted vs. what was actually planted
- **Status** — highlight areas by current status (not started, sown, planted, harvested)
- **Historical** — overlay a previous season's data for comparison

**MVP scope:** Color-coding by area type. Layer toggles are post-MVP.

### 6.3 Planting Plan

For each planting entry the user specifies:

- **Plant** — selected from plant profiles or entered ad-hoc
- **Area** — which garden area this is planted in
- **Sowing method** (one of):
  - Pre-cultivation indoors → planned transplant date
  - Direct sowing outdoors
- **Timing:**
  - If pre-cultivation: indoor sowing date + outdoor transplant date
  - If direct sowing: outdoor sowing date
  - Expected harvest window (start–end)

The plan is the source of truth for generating calendar tasks and measuring plan-vs-actual.

### 6.4 Activity Logging

The user can log events against a plant or area:

| Activity | Description |
|---|---|
| Sown indoors | Pre-cultivation started |
| Sown outdoors | Direct sowing done |
| Transplanted | Moved from indoors to garden |
| Watered | Watering event |
| Fertilized | Fertilizing event |
| Pruned | Pruning / thinning |
| Harvested | Harvest recorded (optional: quantity/weight) |
| Problem noted | Pest, disease, or other issue logged |

Each log entry records: date, optional note, optional photo.

**Entry points:**
- From the map (tap area → log activity)
- From a list/table view of all plantings
- **Quick Log** — a fast-access action from the home screen for one-tap logging ("I did X to Y today")

### 6.5 Calendar & Tasks

- Weekly and monthly calendar views
- Tasks auto-generated from the planting plan (e.g., "Sow tomatoes indoors," "Transplant basil to Bed 3")
- Manual task creation for one-off work (e.g., "Build new raised bed")
- Tasks can be marked as done, which creates a corresponding log entry
- Overdue task highlighting

### 6.6 Plant Profiles

Each plant has a profile with:

**Core fields (MVP):**
- Name
- Type (vegetable, herb, flower, berry, tree/shrub)
- Notes (free text)

**Extended fields:**
- Recommended sowing window (indoor / outdoor)
- Sun requirements (full sun / partial shade / shade)
- Water needs (low / medium / high)
- Spacing (cm between plants, cm between rows)
- Days to germination
- Days to harvest
- Companion plants (grows well with)
- Antagonist plants (avoid planting near)
- Crop rotation group (legume, brassica, nightshade, root, etc.)

In MVP, users create all plant profiles themselves. A future version may integrate an external plant data API to offer a pre-populated starter library.

### 6.7 Notes

- Per plant instance (e.g., "The tomatoes in Bed 2 got blight this year")
- Per area (e.g., "Soil in this bed is very clay-heavy")
- General season notes (e.g., "Late frost in May — delayed everything by two weeks")

### 6.8 Season & History

A **season** represents one growing cycle, typically spring through autumn. The user defines when a season starts and ends (default: January 1 – December 31, adjustable).

- Archive a season to start fresh for the next year
- Browse previous seasons: map state, plantings, logs, notes
- Compare two seasons side-by-side
- Crop rotation warnings: flag when the same crop group is planted in the same area as the previous 1–2 seasons

### 6.9 Collaboration

- A garden can be shared with one or more other user accounts
- Roles: **Owner** (full control, can delete garden and manage members) and **Member** (can view, plan, and log)
- All collaborators see the same garden map, plan, and logs in real time (cloud-synced)
- Activity log entries show which user performed them

---

## 7. User Stories

### Garden setup
- As a user, I want to create a garden with a grid-based map so that I have a visual overview of my space
- As a user, I want to define areas on the map (raised beds, open beds, tree zones) so that I can organize my garden spatially
- As a user, I want to label and color-code areas so that I can quickly distinguish them

### Planning
- As a user, I want to assign plants to specific areas so that I know what goes where
- As a user, I want to choose a sowing method (indoor pre-cultivation or direct outdoor sowing) so that the app tracks the right dates
- As a user, I want the app to generate tasks from my plan so that I know what to do and when

### Logging
- As a user, I want to quickly log that I performed an activity (sowed, watered, harvested, etc.) so that I maintain an accurate record
- As a user, I want to log activities from the map or from a list view so that I can choose whichever is faster

### Calendar
- As a user, I want to see upcoming tasks on a calendar so that I can plan my week
- As a user, I want to mark tasks as done and have that create a log entry automatically

### History
- As a user, I want to browse previous seasons so that I can see what I planted and how it went
- As a user, I want to compare seasons so that I can learn and improve over time

### Collaboration
- As a user, I want to invite another person to my garden so that we can plan and log together
- As a user, I want to see who performed each logged activity so that we have accountability

### Plant profiles
- As a user, I want to create and edit custom plant profiles for the varieties I grow

---

## 8. MVP Scope

The first release focuses on delivering a usable core loop: **set up garden → plan what to plant → log what you do → review.**

| # | Feature | Scope |
|---|---|---|
| 1 | **User accounts** | Email/password registration and login |
| 2 | **Garden map** | Grid-based editor; place, label, and color-code rectangular areas |
| 3 | **Planting plan** | Assign plants to areas with sowing method and key dates |
| 4 | **Activity logging** | Log: sown indoors, sown outdoors, transplanted, watered, fertilized, harvested |
| 5 | **Calendar & tasks** | Monthly view with auto-generated tasks from the plan; mark tasks as done |
| 6 | **Plant profiles (basic)** | Name, type, notes; user-created (no pre-populated library in MVP) |
| 7 | **Notes** | Free-text notes on plants, areas, and the season |
| 8 | **Season management** | Create and archive seasons; view current vs. previous season |
| 9 | **i18n** | Norwegian Bokmål (nb) and English (en) |
| 10 | **PWA** | Installable, offline-capable with background sync |

**Explicitly deferred from MVP:**
- Layer toggles on the map
- Collaboration / shared gardens
- Photo attachments
- Crop rotation warnings
- Companion/antagonist planting hints
- Push notifications
- Frost date / hardiness zone integration
- Seed inventory
- Statistics and analytics

---

## 9. Feature Candidates (Post-MVP)

Prioritized roughly by expected user value and implementation effort.

### High value
- **Collaboration** — shared gardens with owner/member roles
- **Photo journal** — timestamped photos per plant or area; low friction, high engagement
- **Crop rotation tracking** — warn when the same crop group is placed in the same area as recent seasons
- **Layer toggles** — show/hide plan vs. actual, status, historical overlays on the map

### Medium value
- **Starter plant library** — pre-populated library of common Norwegian garden plants via an external data source or API; reduces manual data entry for new users
- **Companion planting hints** — flag incompatible neighbors based on plant profile data
- **Frost date / zone awareness** — user sets location or hardiness zone; app auto-suggests sowing windows
- **Push reminders** — notifications for upcoming or overdue tasks
- **Seed inventory** — track owned seeds, quantities, expiry; cross-reference with the plan ("you planned 3 varieties you don't have seeds for")
- **Pest & disease logging** — dedicated log type with structured fields (pest/disease name, treatment, outcome)
- **Sun/shade mapping** — per-area attribute (full sun / partial shade / shade) to improve plant placement suggestions

### Lower priority
- **Statistics & analytics** — yield tracking, success rates, season-over-season trends
- **Automatic suggestions** — recommend plants, timing, or layouts based on profiles and history
- **Garden plan sharing** — export or publish a read-only view of your garden plan
- **Native mobile apps** — wrap the PWA with Capacitor for App Store / Play Store distribution
- **Social login** — Google, Apple, or other OAuth providers
- **Multiple gardens per account** — manage more than one garden (e.g., cabin + home)
- **Advanced map editor** — freeform shapes, curved beds, satellite background tracing

---

## 10. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Performance** | Initial load under 3 seconds on 4G; interactions feel instant (<100ms feedback) |
| **Offline** | Core read and logging flows work without connectivity; sync on reconnect |
| **Accessibility** | WCAG 2.1 AA compliance; keyboard navigable; screen reader friendly |
| **Responsive design** | Fully usable on mobile (360px+), tablet, and desktop |
| **Data privacy** | User data stored securely; GDPR-compliant; no selling of personal data |
| **Browser support** | Latest two versions of Chrome, Firefox, Safari, Edge |
| **Localization** | All user-facing strings externalized; nb and en from day one |

---

## 11. Success Criteria

- Users log activities at least weekly during the growing season
- Users return to the app across multiple seasons (year-over-year retention)
- Users report improved overview and reduced reliance on paper notes
- Collaborative gardens see contributions from multiple members
- The app is installable and used offline in garden settings

---

## 12. Resolved Decisions

| Question | Decision |
|---|---|
| **Starter plant library** | No pre-populated library in MVP. Users create their own plant profiles. A future version may integrate an external plant data API if a suitable Norwegian-relevant source is identified. |
| **Offline conflict resolution** | Last-write-wins (by timestamp). Simpler to implement and sufficient for the expected low-contention usage pattern of a household sharing a garden. |
| **Multiple gardens per account** | Deferred from MVP, but the data model must support it from day one (garden as a top-level entity, user-to-garden as a many-to-many relationship). |
| **Monetization** | Personal project. No paid tiers, subscriptions, or feature gating. The app will be self-hosted and shared with family members who each have their own gardens and accounts. |
