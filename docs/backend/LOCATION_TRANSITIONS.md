# Academy location transitions

`PUT /api/v2/sessions/{sessionId}/location` is the authoritative REST boundary
for an Academy doorway. It deliberately does not add an undeclared WebSocket
event to Discovery Protocol 2.0.0.

Request: `{ "roomId": "room-mathematics" }`.

The caller must be a session member, be in `exploring` activity, and stand
within the server-side interaction radius of the requested door (or of the
current room's exit). The successful response is
`{ "roomId": "…", "position": { "x": 0, "y": 0, "z": 0 } }`.

The server sets the player's canonical position, stores its checkpoint, and
the normal `world.snapshot` flow distributes that position to every client.
Clients never choose a destination coordinate.
