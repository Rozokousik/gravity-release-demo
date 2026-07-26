# Changelog

All notable changes to Gravity Release Demo are documented in this file.

## [Unreleased]

## [0.3.1] - 2026-07-16

### Changed

- Task loading now uses a short-lived client-side cache and coalesces duplicate refresh requests.
- The task list skips DOM updates when the rendered state has not changed.

## [0.3.0] - 2026-07-13

### Added

- A profile section that shows the signed-in user's name, role, handle, and initials avatar.

## [0.2.1] - 2026-07-10

### Fixed

- Sign-in now rejects blank usernames and passwords with field-specific, accessible guidance.

## [0.2.0] - 2026-07-08

### Added

- A dark theme with an accessible header toggle.

### Changed

- Theme preference is restored from local storage and follows the system setting by default.

### Added

- Initial task management dashboard.
