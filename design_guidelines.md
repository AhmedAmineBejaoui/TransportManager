# Design Guidelines - Application de Gestion de Transport

## Design Approach

**Selected System**: Material Design 3 principles adapted for dashboard/SaaS application

**Rationale**: This is a utility-focused, information-dense management application requiring efficiency, clarity, and data visualization. Material Design provides robust patterns for complex dashboards while maintaining accessibility and responsive behavior.

**Core Principles**:
- Information hierarchy over decoration
- Functional clarity for multi-role interfaces
- Consistent patterns across admin/driver/passenger views
- Data-first presentation with clear visual groupings

## Typography System

**Font Family**: 
- Primary: Inter (via Google Fonts CDN) for UI elements, forms, navigation
- Monospace: JetBrains Mono for data tables, IDs, timestamps

**Hierarchy**:
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-medium
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Secondary/Helper Text: text-sm
- Table Data: text-sm
- Labels: text-sm font-medium uppercase tracking-wide

## Layout System

**Spacing Units**: Consistent use of Tailwind units: 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-4 to p-6
- Section spacing: gap-6, gap-8
- Page margins: p-6 to p-8
- Card spacing: p-4 to p-6

**Grid System**:
- Dashboard: Sidebar (w-64) + Main content (flex-1)
- Stats cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Content cards: grid-cols-1 lg:grid-cols-2
- Tables: Full width with horizontal scroll on mobile

**Container Widths**:
- Dashboard content: max-w-7xl mx-auto
- Forms: max-w-2xl
- Modals: max-w-xl to max-w-4xl depending on content

## Component Library

### Navigation Structure

**Sidebar Navigation** (Admin/Driver/Passenger):
- Fixed left sidebar, full height
- Logo/brand at top
- Role-specific menu items with icons
- User profile section at bottom
- Active state indication with subtle background treatment
- Collapsible on mobile (hamburger menu)

**Top Bar**:
- Breadcrumb navigation
- Search functionality (for admin)
- Notifications icon with badge counter
- User profile dropdown

### Dashboard Components

**Stats Cards**:
- Grid layout with equal height cards
- Icon + metric + label structure
- Optional trend indicator (↑ ↓)
- Subtle border treatment
- Hover state with slight elevation

**Data Tables**:
- Striped rows for readability
- Sticky header on scroll
- Sort indicators on column headers
- Action buttons (Edit, Delete, View) in rightmost column
- Pagination controls at bottom
- Empty state with illustration and CTA
- Loading state with skeleton rows

**Trip Cards** (Passenger View):
- Departure/Arrival locations prominently displayed
- Time and date information
- Available seats indicator
- Vehicle and driver information
- Prominent "Reserve" CTA button
- Status badges (Available, Full, In Progress, Completed)

**Forms**:
- Clear field labels above inputs
- Helper text below inputs when needed
- Error states with validation messages
- Required field indicators (*)
- Multi-step forms with progress indicator for reservations
- Grouped related fields with visual separation

**Modals/Dialogs**:
- Confirmation dialogs for destructive actions
- Detail views for trips/reservations
- Form modals for quick actions
- Close button (X) in top-right
- Actions aligned right (Cancel + Primary Action)

**Status Badges**:
- Pill-shaped badges for status indicators
- Consistent positioning (top-right of cards)
- Clear visual differentiation between states:
  - Planned/Scheduled
  - In Progress/En Route
  - Completed
  - Cancelled
  - Confirmed/Pending for reservations

### Real-time Features

**Notification Toast**:
- Top-right positioned
- Auto-dismiss after 5 seconds
- Stacked if multiple
- Close button
- Icon indicating type (success, info, warning, error)

**Live Status Updates**:
- Pulsing dot indicator for "live" status
- Last updated timestamp
- Refresh button for manual updates

### Admin-Specific Components

**Management Tables**:
- Bulk actions (checkbox selection)
- Advanced filters dropdown
- Export functionality
- Create new entity button (top-right)
- Quick edit inline for simple fields

**Statistics Dashboard**:
- Date range selector
- Chart containers (using Chart.js or Recharts)
- KPI cards with comparisons
- Tabbed interface for different report types

**User Management**:
- Role badges
- Status indicators (Active/Inactive)
- Quick action menu (Edit, Disable, Reset Password)
- Avatar placeholders with initials

### Driver-Specific Components

**Trip Timeline**:
- Vertical timeline of assigned trips
- Current trip highlighted
- Quick status update buttons
- Passenger list for current trip

**Seat Map** (if implementing seat selection):
- Grid visualization of vehicle layout
- Color-coded seat status
- Click to select/view reservation details

## Responsive Behavior

**Breakpoints**:
- Mobile: < 768px (single column, collapsed sidebar)
- Tablet: 768px - 1024px (adjusted grid, visible sidebar)
- Desktop: > 1024px (full multi-column layouts)

**Mobile Adaptations**:
- Stack dashboard stats vertically
- Convert tables to card-based lists
- Bottom navigation bar for main sections
- Full-screen modals
- Touch-friendly button sizes (min-h-12)

## Accessibility Standards

- ARIA labels for all interactive elements
- Keyboard navigation support (Tab, Enter, Esc)
- Focus indicators on all focusable elements
- Sufficient contrast ratios (WCAG AA minimum)
- Screen reader announcements for live updates
- Form error announcements
- Skip navigation link

## Animations

**Minimal, Purposeful Animations**:
- Page transitions: fade in (150ms)
- Modal/dialog: scale + fade (200ms)
- Dropdown menus: slide down (150ms)
- Toast notifications: slide in from right (200ms)
- Loading states: skeleton screens (no spinners unless necessary)
- Hover transitions: 150ms ease

**No Animations For**:
- Table sorting/filtering
- Data updates
- Status changes
- Form validation

## Images

**Logo/Branding**: Single company logo in sidebar navigation (top-left)

**User Avatars**: Circular avatars with initials fallback (32px for navbar, 48px for profile pages)

**Empty States**: Simple illustrations for:
- No trips found
- No reservations yet
- No data to display

**Vehicle Images** (Admin/Trip cards): Small thumbnails (80x60px) showing vehicle type, displayed in trip cards and vehicle management section

**No Hero Images**: This is a dashboard application - login page uses centered form layout without hero imagery