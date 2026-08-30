# Implementation Plan: Manage Kills & Stages System

## Goal Description
The objective is to replace the existing "Manage Kills/Wins" button with a comprehensive, professional **"Manage Kills & Stages"** system. We will also remove the "Clear Messages" button as requested to keep the UI clean. The new modal will allow admins to easily update match results (Kills/Booyahs) and simultaneously promote specific teams to the next stage (e.g., Qualifiers to Semi-Finals) directly from the Dashboard.

## Proposed Changes

### 1. `src/components/admin/TournamentManagement.jsx`
- **[DELETE]** Remove the **"Clear Messages"** button entirely from the Active Tournaments card.
- **[MODIFY]** Rename the **"Manage Kills/Wins"** button to **"Manage Kills & Stages"**.
- **[MODIFY]** Redesign the `showLeaderboard` modal to include a dual-tab or split-view system:
  - **Tab 1: Leaderboard & Kills**: Will retain the current logic (update kills, assign 1st/2nd/3rd places).
  - **Tab 2: Advance to Next Stage**: A clean, professional table showing all teams in the current tournament.
    - Each row will have a dropdown allowing the admin to select a **Target Tournament** (e.g. "Mega Championship - Semi Final A").
    - A **"Promote"** button next to each team. Clicking this will seamlessly move the team's Registration entry into the new tournament and mark them as "Qualified".

### 2. Move Team Logic (Admin Panel)
- We will implement a robust promotion function inside `TournamentManagement.jsx` (similar to the one in `TournamentDetail.jsx`) that:
  - Validates that the team isn't already in the target tournament.
  - Creates a new `Registration` record in the target tournament with the team's details.
  - Marks the original registration as `is_qualified: true`.
  - Updates the `current_teams` count on the target tournament.

## User Review Required
> [!IMPORTANT]
> The new "Advance to Next Stage" system will rely on you creating the next stage as a separate tournament first (e.g., creating a "Semi-Final A" tournament). Then, from the "Qualifiers" Manage Stages menu, you can select that "Semi-Final A" tournament from the dropdown and promote the winning teams into it.

## Open Questions
1. Do you want the **Advance to Next Stage** feature to be a separate tab inside the modal, or should I just add a "Target Tournament" dropdown directly next to the "Update Kills" button in the same list? (A separate tab might look cleaner and more professional).
2. Should I add a "Promote Top 12 Teams" bulk action button, or do you prefer promoting teams one by one manually?

Click **Proceed** to approve this plan, or let me know if you want any changes!