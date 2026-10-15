## Initialize Your Project

Run **mcdev: Initialize Project** from the Command Palette when available in an open mcdev project; it uses your selected CLI source. Command visibility still depends on existing project detection. In a fresh folder where the command is unavailable, use a separately installed CLI in a terminal (the bundled fallback does not add `mcdev` to PATH):

```bash
mcdev init
```

This wizard will guide you through:
- Setting up your `.mcdevrc.json` configuration
- Configuring `.mcdev-auth.json` with your credentials
- Initializing Git when available (otherwise warning and skipping all Git steps)
- Creating your first backup
