# Cloud-hosted backend, not a home server

The backend runs in the cloud rather than on a Raspberry Pi/NAS in the home. Parents must reach the Admin from anywhere, Google OAuth rejects private-IP redirect URLs, future email reading must run around the clock, and a paid multi-household service can't live in one family's closet. The cost is that smart-home control must reach *into* the home through the Device provider (e.g. Home Assistant Cloud or a tunnel) instead of talking to it on the LAN.
