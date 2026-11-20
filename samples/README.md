# caddy-fileserver Samples (v1)

Runnable step-by-step samples demonstrating each feature of `caddy-fileserver`.

## Samples Index

```
samples/
├── caddy.sample.json           # Sample Caddy JSON configuration
├── README.md                   # This guide
└── v1/
    ├── 01-init/                # End-to-end static site initialization (folder + HTML + Caddy route)
    │   ├── run.js
    │   ├── run.bat
    │   └── run.sh
    ├── 02-check/               # Audit Ubuntu filesystem & Caddy route alignment
    │   ├── run.js
    │   ├── run.bat
    │   └── run.sh
    ├── 03-template/            # Standalone starter HTML & XML sitemap generation
    │   ├── run.js
    │   ├── run.bat
    │   └── run.sh
    └── 04-list/                # Enumerate all file_server routes in Caddy JSON
        ├── run.js
        ├── run.bat
        └── run.sh
```

## Running Any Sample

From repository root:

```bash
# Windows
.\samples\v1\01-init\run.bat

# Linux / macOS
node samples/v1/01-init/run.js
```
