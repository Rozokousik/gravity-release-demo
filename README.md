# Gravity Release Demo

A small, dependency-free task management dashboard used to demonstrate how a Release Intelligence Agent can inspect merged pull requests and produce useful release notes.

## Run locally

Open `index.html` in a modern browser. No build step or server is required.

## What the dashboard does

- Lets a user sign in to a focused task workspace
- Displays seeded tasks with project, priority, and completion state
- Adds new tasks and filters the active list
- Uses a lightweight in-browser API adapter so the demo is self-contained

## Repository conventions

Feature work is developed on short-lived branches and integrated with non-fast-forward merge commits. `CHANGELOG.md` records the user-facing impact of each merged change.

## Technology

HTML, CSS, and modern browser JavaScript.

## API version

The dashboard uses the task API v2 contract (`/api/v2/tasks`). The v1 endpoint and its convenience client functions have been removed.

> **Breaking change:** integrations must switch from the v1 task methods to the v2 request contract before upgrading.
