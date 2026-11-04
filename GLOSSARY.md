# BoNavet

A family hub shown on a wall-mounted tablet: it shows what each family member has going on during the week and lets the household control its smart-home devices.

## People

**Household**:
One family using BoNavet; everything else (Family Members, Calendars, Tasks, Devices) belongs to exactly one Household.
_Avoid_: Tenant, account, family, organisation

**Family Member**:
A person in the household whose plans are shown on the Dashboard; each has exactly one colour.
_Avoid_: User, profile, person

**Parent**:
A Family Member who may sign in to the Admin and change what the Dashboard shows.
_Avoid_: Admin user, owner

## Surfaces

**Dashboard**:
The always-on, touch-only view shown on a Screen; it never requires sign-in.
_Avoid_: Kiosk, wall screen, home screen

**Admin**:
The signed-in web pages where Parents configure BoNavet.
_Avoid_: Settings, backoffice, control panel

**Screen**:
One tablet paired with a Household to show its Dashboard; a Parent can revoke it from the Admin.
_Avoid_: Kiosk, device, display, tablet

**Quiet Hours**:
The nightly period when the Dashboard is dimmed until touched.
_Avoid_: Night mode, sleep mode

## Planning

**Calendar**:
An external source of Events (e.g. a Google Calendar) connected to a Household; it is not tied to any one Family Member.
_Avoid_: Schedule, scheme

**Event**:
Something happening at a date and time, read from a Calendar.
_Avoid_: Appointment, entry

**Tag**:
A bracketed name at the start of an Event's title (e.g. `[Ella]`) that assigns the Event to a Family Member; an Event may carry several Tags.
_Avoid_: Prefix, label, marker

**Household Event**:
An Event with no recognised Tag; it belongs to the whole Household rather than to any one Family Member.
_Avoid_: Shared event, untagged event, family event

**Task**:
Something a Family Member must get done by a due date, with no time slot; owned by BoNavet, not by a Calendar.
_Avoid_: Homework, todo, chore, assignment

## Home

**Device**:
A controllable smart-home appliance (light, plug, thermostat…) shown on the Dashboard.
_Avoid_: Appliance, gadget, entity
