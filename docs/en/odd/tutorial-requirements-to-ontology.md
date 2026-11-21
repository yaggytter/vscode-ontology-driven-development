# Tutorial: From Requirements to an Ontology

This tutorial walks through one loop of [ontology-driven development](what-is-odd.md) with a small meeting room booking system. You will write requirements with IDs, turn them into an Object Ontology, tag every element with the requirements it realizes, let the tools point out what is missing, review the result in the diagram, and check it with the `oont` CLI.

It takes about 30 minutes. You need VS Code with this extension. For step 7 you also need the CLI. It is not on npm yet, so run it from a clone of this repository as described in the [CLI reference](../reference/cli.md#install).

The finished ontology is close to the bundled sample **Meeting Room Booking (Object Ontology)**, which you can open at any time with **ODD: Create Sample Ontology...** to compare.

## 0. Set up a folder

Create a folder named `room-booking` and open it in VS Code. You will create two files in it:

| File | Contents |
| --- | --- |
| `requirements.md` | The requirements, each with an ID. |
| `room-booking.oont.yaml` | The ontology. The `.oont.yaml` suffix is what makes the extension and the CLI recognize it. |

## 1. Write the requirements with IDs

A company of about 30 people has three meeting rooms and books them in a shared spreadsheet. Double bookings and no-shows (rooms booked but never used) are the problems to solve.

Create `requirements.md` and give every requirement an ID. The IDs are what the ontology will point to.

```markdown
# Meeting room booking: requirements

| ID | Requirement |
| --- | --- |
| REQ-001 | Members book a room by giving a start time and an end time. |
| REQ-002 | Two bookings of the same room cannot overlap. |
| REQ-003 | A booking cannot have more attendees than the room's capacity. |
| REQ-004 | The person who made a booking can cancel it before it starts. |
| REQ-005 | Attendees check in within 15 minutes before or after the start time. |
| REQ-006 | A booking with no check-in 15 minutes after the start is released automatically, and the organizer is notified. |
| REQ-007 | Admins can suspend a room. A suspended room cannot be booked. |
```

Any ID works as long as it starts with a letter and uses only letters, digits, `_`, `-` and `.`, such as `REQ-001` or `US-12.3`.

## 2. Ask the questions the requirements leave open

Before writing YAML, read the requirements and ask the questions from [What Is ODD?](what-is-odd.md#from-requirements-to-an-ontology): identity, lifecycle, cardinality, permissions, exceptions. For this system, these came up, and the business answered:

| Question | Answer | Effect on the ontology |
| --- | --- | --- |
| Are a "booking" and "using the room" different things? | No. Use the booking's status: reserved, in use, cancelled, released. | One object type `Booking` with a `status` property. |
| Are cancelled and released bookings deleted? | No. They are kept for no-show analysis. | Cancelling is a `modifyObject` rule, not `deleteObject`. |
| Can one booking hold several rooms? | No. | The link from Booking to Room has cardinality `one`. |
| Are attendees other than the organizer recorded? | Only their number. | An `attendees` integer, no link to members. |

Write the answers down, for example under the requirements table. They are the reasons behind the ontology.

## 3. Extract object types, links and actions

Go through the requirements and map what you find:

| In the requirements | Becomes | Here |
| --- | --- | --- |
| Things (nouns) | Object types | `Member`, `Room`, `Booking` |
| Their properties | Properties | `capacity`, `startsAt`, `status`, ... |
| Relationships | Link types | `bookingRoom` (a booking holds one room), `bookingOrganizer` (a booking has one organizer) |
| Operations (verbs) | Action types | `reserveRoom`, `cancelBooking`, ... |
| Rules | Validations | "Attendees must not exceed the room capacity." |

For example, REQ-001 and REQ-002 become an action with parameters, the rules it applies, and the conditions that must hold:

```yaml
reserveRoom:
  parameters:
    room: { type: objectRef, objectType: Room, required: true }
    startsAt: { type: timestamp, required: true }
    # ...
  rules:
    - op: createObject
      objectType: Booking
      # ...
  validations:
    - description: No other reserved or in-use booking of the same room may overlap.
```

Start small. In this step, cover the booking itself (REQ-001 to REQ-004 and REQ-007) and leave check-in and no-shows for later. The tools will remind you.

## 4. Add the requirements registry and references

Now connect the ontology to the requirements. There are two parts:

- A **registry** at the top level, `requirements:`, lists every requirement ID with a short title. A plain string is the title. The mapping form can also say where the full text lives (`source`).
- A **reference**, `requirements: [ID, ...]`, on an object type, interface, link type, action type or validation says "this element realizes these requirements".

Create `room-booking.oont.yaml` with this content. The line numbers in the outputs later in this tutorial match this file exactly.

```yaml
objectOntology: 1
name: Meeting Room Booking
description: Book meeting rooms without double bookings or no-shows.

requirements:
  REQ-001: { title: Members can book a room for a time range, source: requirements.md }
  REQ-002: No overlapping bookings for the same room
  REQ-003: Attendees must not exceed the room capacity
  REQ-004: The organizer can cancel before the start time
  REQ-005: Check in within 15 minutes of the start time
  REQ-006: Release no-shows after 15 minutes and notify the organizer
  REQ-007: Admins can suspend a room; suspended rooms cannot be booked

objectTypes:
  Member:
    displayName: Member
    primaryKey: memberId
    titleProperty: name
    properties:
      memberId: string
      name: string
      role: { type: string, enum: [staff, admin] }

  Room:
    displayName: Meeting room
    requirements: [REQ-003, REQ-007]
    primaryKey: roomId
    titleProperty: name
    properties:
      roomId: string
      name: string
      capacity: { type: integer, description: Maximum number of attendees. }
      status: { type: string, enum: [active, suspended] }

  Booking:
    displayName: Booking
    description: Cancelled bookings are kept, not deleted.
    requirements: [REQ-001, REQ-004]
    primaryKey: bookingId
    titleProperty: bookingId
    properties:
      bookingId: string
      startsAt: timestamp
      endsAt: timestamp
      attendees: integer
      status: { type: string, enum: [reserved, inUse, cancelled, released] }

linkTypes:
  bookingRoom:
    from: { objectType: Booking, name: room, cardinality: one }
    to: { objectType: Room, name: bookings, cardinality: many }
  bookingOrganizer:
    from: { objectType: Booking, name: organizer, cardinality: one }
    to: { objectType: Member, name: bookings, cardinality: many }

actionTypes:
  reserveRoom:
    displayName: Reserve room
    requirements: [REQ-001, REQ-002, REQ-003, REQ-007]
    parameters:
      bookingId: { type: string, required: true }
      room: { type: objectRef, objectType: Room, required: true }
      organizer: { type: objectRef, objectType: Member, required: true }
      startsAt: { type: timestamp, required: true }
      endsAt: { type: timestamp, required: true }
      attendees: { type: integer, required: true }
    rules:
      - op: createObject
        objectType: Booking
        set: { bookingId: $bookingId, startsAt: $startsAt, endsAt: $endsAt, attendees: $attendees, status: reserved }
      - { op: createLink, linkType: bookingRoom, from: bookingId, to: room }
      - { op: createLink, linkType: bookingOrganizer, from: bookingId, to: organizer }
    validations:
      - description: The room must not be suspended.
        requirements: [REQ-007]
        expr: "room.status == 'active'"
      - description: Attendees must not exceed the room capacity.
        requirements: [REQ-003]
        expr: "attendees <= room.capacity"
      - description: No other reserved or in-use booking of the same room may overlap.
        requirements: [REQ-002]

  cancelBooking:
    displayName: Cancel booking
    requirements: [REQ-004]
    parameters:
      booking: { type: objectRef, objectType: Booking, required: true }
      requestedBy: { type: objectRef, objectType: Member, required: true }
    rules:
      - { op: modifyObject, objectType: Booking, object: booking, set: { status: cancelled } }
    validations:
      - description: Only the organizer can cancel.
        expr: "booking.organizer == requestedBy"
      - description: Only a reserved booking that has not started can be cancelled.
        expr: "booking.status == 'reserved' && now() < booking.startsAt"
```

A few things to notice:

- `Room` references REQ-003 (capacity) and REQ-007 (suspension) because it holds the properties those rules need.
- The validations of `reserveRoom` each reference the one requirement they enforce. A validation's references are counted on their own; they are not inherited from the action.
- Properties use the shorthand `memberId: string` where nothing else is needed.

## 5. Let the Problems panel point out what is missing

Open the Problems panel (`Cmd+Shift+M` / `Ctrl+Shift+M`). It shows two warnings on the registry:

```text
Requirement "REQ-005" is not referenced by any element.
Requirement "REQ-006" is not referenced by any element.
```

This is `requirement-unreferenced`. It is not a mistake in the file; it is your to-do list. No element realizes check-in or no-show release yet.

Now make a typo on purpose. In `cancelBooking`, change `requirements: [REQ-004]` to `requirements: [REQ-04]`. An error appears on that ID:

```text
Requirement "REQ-04" is not defined in requirements.
```

This is `requirement-undefined`: the reference does not match any ID in the registry. Change it back to `REQ-004`, and the error goes away.

Other requirement diagnostics catch duplicate IDs in one list, IDs with invalid characters, registry entries without a title, and references in a file that has no registry. They are all listed in the [format reference](../reference/object-ontology-format.md#requirement-diagnostics).

## 6. Review in the diagram

Press `Cmd+Alt+O` / `Ctrl+Alt+O` to open the diagram. This is what you walk through with the business.

- **Object types and links.** Member, Meeting room and Booking appear as boxes. The two links show **N:1** badges: many bookings per room, one room per booking. Check the cardinality against the answers from step 2.
- **Inspector.** Click **Meeting room**. The Inspector lists its properties, links and a **Requirements** section:

  ```text
  REQ-003 Attendees must not exceed the room capacity
  REQ-007 Admins can suspend a room; suspended rooms cannot be booked
  ```

  Ask the business: "Is this everything the room needs for these requirements?"
- **Actions panel.** Click **Actions** in the toolbar and select **Reserve room**. You see its parameters, effects, the conditions under **Rejected unless** with their requirement IDs in brackets, and a **Requirements** section. The object types the action touches are outlined on the diagram.
- **SPARQL.** Click **SPARQL**, choose **9. Requirements and the elements that realize them** from **Examples:**, and run it. You get one row per requirement and element. REQ-005 and REQ-006 appear with no element, which matches the warnings.

Record the questions and answers from the review. If the review changes a concept, change the ontology first.

## 7. Check it with the CLI

The same checks run outside VS Code. In a terminal in the `room-booking` folder (with `oont` set up as in the [CLI reference](../reference/cli.md#install)):

```text
$ oont validate room-booking.oont.yaml
room-booking.oont.yaml:10:3: warning: Requirement "REQ-005" is not referenced by any element. [requirement-unreferenced]
room-booking.oont.yaml:11:3: warning: Requirement "REQ-006" is not referenced by any element. [requirement-unreferenced]
1 file checked: 0 errors, 2 warnings
```

The exit code is 0, because warnings alone do not fail. With `--strict`, warnings fail too, and the exit code is 1. Use that in CI when every requirement must be covered before merging.

```text
$ oont validate room-booking.oont.yaml --strict
room-booking.oont.yaml:10:3: warning: Requirement "REQ-005" is not referenced by any element. [requirement-unreferenced]
room-booking.oont.yaml:11:3: warning: Requirement "REQ-006" is not referenced by any element. [requirement-unreferenced]
1 file checked: 0 errors, 2 warnings
$ echo $?
1
```

Now work through the to-do list. Add these two actions at the end of the file, under `actionTypes:`:

```yaml
  checkIn:
    displayName: Check in
    requirements: [REQ-005]
    parameters:
      booking: { type: objectRef, objectType: Booking, required: true }
    rules:
      - { op: modifyObject, objectType: Booking, object: booking, set: { status: inUse } }
    validations:
      - description: Check-in must be within 15 minutes before or after the start time.
        expr: "abs(minutesBetween(now(), booking.startsAt)) <= 15"

  releaseNoShow:
    displayName: Release no-show booking
    description: Run by the system every minute.
    requirements: [REQ-006]
    x-trigger: { kind: schedule, every: 1m }
    parameters:
      booking: { type: objectRef, objectType: Booking, required: true }
    rules:
      - { op: modifyObject, objectType: Booking, object: booking, set: { status: released } }
    sideEffects:
      - Notify the organizer that the booking was released.
```

`x-trigger` is an extension field. The tools ignore it, but it keeps a note for whoever implements the scheduler. See [`x-` extension fields](../reference/object-ontology-format.md#x--extension-fields).

Validate again:

```text
$ oont validate room-booking.oont.yaml --strict
1 file checked: 0 errors, 0 warnings
```

Every requirement is now realized by at least one element. Export the summary that an AI agent would get as context:

```text
$ oont export summary room-booking.oont.yaml
```

Here is an excerpt of the output:

```markdown
# Ontology: Meeting Room Booking

Book meeting rooms without double bookings or no-shows.

Use these exact API names. Objects are identified by their type's primary key.
Only the actions listed below may change data; everything else is read-only.

## Object types

### Member
Properties:
  - memberId: string (primary key)
  - name: string
  - role: string (one of: staff | admin)

### Room ("Meeting room")
Requirements: REQ-003, REQ-007
Properties:
  - roomId: string (primary key)
  - name: string
  - capacity: integer — Maximum number of attendees.
  - status: string (one of: active | suspended)

...

## Actions (the only allowed writes)

### reserveRoom ("Reserve room")
Requirements: REQ-001, REQ-002, REQ-003, REQ-007
Parameters:
  - bookingId: string, required
  - room: Room (by primary key), required
  - organizer: Member (by primary key), required
  - startsAt: timestamp, required
  - endsAt: timestamp, required
  - attendees: integer, required
Effects:
  - createObject Booking (sets bookingId, startsAt, endsAt, attendees, status)
  - createLink bookingRoom
  - createLink bookingOrganizer
Rejected unless:
  - The room must not be suspended. (requirements: REQ-007)
  - Attendees must not exceed the room capacity. (requirements: REQ-003)
  - No other reserved or in-use booking of the same room may overlap. (requirements: REQ-002)

...

## Requirements
- REQ-001: Members can book a room for a time range — realized by object type Booking, action reserveRoom
- REQ-002: No overlapping bookings for the same room — realized by action reserveRoom, a validation of action reserveRoom
- REQ-003: Attendees must not exceed the room capacity — realized by object type Room, action reserveRoom, a validation of action reserveRoom
- REQ-004: The organizer can cancel before the start time — realized by object type Booking, action cancelBooking
- REQ-005: Check in within 15 minutes of the start time — realized by action checkIn
- REQ-006: Release no-shows after 15 minutes and notify the organizer — realized by action releaseNoShow
- REQ-007: Admins can suspend a room; suspended rooms cannot be booked — realized by object type Room, action reserveRoom, a validation of action reserveRoom
```

Each element with references carries a `Requirements:` line, and the `## Requirements` section shows which elements realize each requirement. An agent that implements `cancelBooking` can see that it serves REQ-004, and a reviewer can see at a glance what a change to REQ-007 affects.

To serve the actions as agent tools, export them as well:

```sh
oont export tools room-booking.oont.yaml -o room-booking.tools.json
```

[Tutorial 6](../ai/tutorial-6-object-ontology-ai-agents.md) and [Tutorial 8](../ai/tutorial-8-claude-code-object-ontology.md) show how to use these files with an AI agent.

## 8. Compare with the sample

Open **ODD: Create Sample Ontology...** → **Meeting Room Booking (Object Ontology)**. The sample covers the same requirements and goes further: `suspendRoom` as its own action, a check that the end time is after the start time, `checkedInAt` on Booking, an `x-retention` note, and example objects. Its requirement titles are written in Japanese. Run the same checks on it after saving it as `room-booking-sample.oont.yaml`.

## What you did

- Gave every requirement an ID and answered the open questions before writing YAML.
- Turned requirements into object types, links, actions and validations.
- Connected every element to its requirements, and let `requirement-unreferenced` show what was still missing and `requirement-undefined` catch a typo.
- Reviewed the result in the diagram, Inspector, Actions panel and SPARQL.
- Checked it with `oont validate` and produced the agent context with `oont export summary`.

## Next steps

- [Object Ontology Format Reference](../reference/object-ontology-format.md): every field in one place.
- [CLI Reference](../reference/cli.md): options, exit codes and CI.
- [Tutorial 6: Object Ontology × AI Agents](../ai/tutorial-6-object-ontology-ai-agents.md): turn the actions into agent tools.
