# Spec: Event Screen — Simultaneous Calendar + Map Layout

## Status
Approved

## Problem Statement
The current event tab requires users to choose between a calendar view and a map view via a toggle button. This forces users to context-switch to see both temporal (when) and geographic (where) information about events. The result is a less intuitive UX where users cannot quickly correlate event dates with event locations without toggling back and forth.

## User Stories
- As a BJJ practitioner, I want to see both the event calendar and the map at the same time so that I can quickly identify upcoming events near me without toggling views.
- As a user on desktop, I want the calendar and map displayed side by side so I can use the full screen width effectively.
- As a user on mobile, I want the calendar stacked above the map so both remain visible by scrolling.

## Acceptance Criteria
- [ ] AC1: The view toggle button is removed from the header.
- [ ] AC2: The calendar and map are rendered simultaneously on all screen sizes.
- [ ] AC3: On large screens (lg breakpoint), calendar and map are displayed side by side (2:3 ratio).
- [ ] AC4: On mobile/tablet, calendar stacks above the map.
- [ ] AC5: Selecting a date on the calendar filters the event list below AND focuses the map on matching events (passes filtered events to map).
- [ ] AC6: Clicking a map pin / event in the list still works as before (onMapClick scrolls to top, map centers on selected event).
- [ ] AC7: Type filter (시합/세미나/오픈매트) continues to filter both calendar dots and map markers simultaneously.
- [ ] AC8: Map height is appropriate in the new side-by-side layout (not full 60-70vh).

## Technical Approach

### Files involved
- `pages/EventExplore.tsx` — primary change: layout restructure + remove toggle
- `components/explore/EventMapView.tsx` — add optional `className` prop to allow height override

### Changes

**`EventMapView.tsx`**
- Add `className?: string` to `EventMapViewProps`
- Apply it on the outer container div alongside the existing classes

**`EventExplore.tsx`**
- Remove `ViewMode` type and `viewMode` state
- Remove the view toggle button from the header
- Replace the conditional `viewMode === 'calendar' ? ... : ...` block with a responsive grid layout:
  ```
  grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start
  ```
  Left: `<EventCalendarView>` (unchanged)
  Right: `<EventMapView className="h-[400px] lg:h-[480px]">` (fixed height in side-by-side layout)
- Event list section (upcoming events / date-filtered events) remains below the grid, unchanged
- Pass `filteredEvents` to `EventMapView` so when a date is selected, the map shows only that date's events

### No DB/API changes required.
### No KMP changes required — web only.

## Test Cases

| ID   | Description                                        | Type   | Expected Result                                           |
|------|----------------------------------------------------|--------|-----------------------------------------------------------|
| TC01 | Load event explore page                            | visual | Calendar and map both visible without toggling            |
| TC02 | Select a date with events on the calendar          | unit   | Event list filters + map shows only that date's events    |
| TC03 | Select a date with no events                       | unit   | Event list shows empty state; map shows empty/no markers  |
| TC04 | Click type filter (e.g. 시합)                       | unit   | Both calendar dots and map markers filter to competitions |
| TC05 | Click map pin / event card map icon                | visual | Map centers on selected event                             |
| TC06 | View on mobile (< lg breakpoint)                   | visual | Calendar stacked above map; both scroll into view         |
| TC07 | View on desktop (≥ lg breakpoint)                  | visual | Calendar left, map right, proper proportions              |

## Out of Scope
- Changing the calendar component internals (EventCalendarView.tsx)
- Adding new event types or data fields
- KMP (Android/iOS) event screen changes

## Open Questions
- (none)
