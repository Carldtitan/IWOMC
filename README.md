# It Works on My Computer

**It Works on My Computer gives development teams a shared record of every package their AI coding tools use. Developers connect the extension to the same project, and IWOMC tracks package changes made by Codex, Claude Code, and Cursor across their computers. It finds packages missing from the project’s dependency files and confirms the corrected setup on a fresh Daytona computer.**

## The problem

AI coding agents frequently install packages while solving tasks. The application starts working, but the required package may remain installed only on that developer’s computer.

This becomes harder during collaboration. One developer uses Codex, anREDACTED uses Cursor, and a third uses Claude Code. Everyone shares the same source code, while each computer accumulates a different set of packages.

The result is familiar: the project works for one teammate and fails for everyone else.

## How IWOMC works

Each developer connects the IWOMC extension to a shared project workspace.

IWOMC records package installations, removals, versions, and package-manager activity during AI coding sessions. It compares this information across the team and checks it against files such as `package.json`, `package-lock.json`, `requirements.txt`, and `pyproject.toml`.

When a package exists on a developer’s computer but is missing from the project files, IWOMC creates a finding that shows:

- Which package is missing
- Where it was installed
- Which agent session used it
- Which project file needs to change

The whole team can see the same package history and understand why their computers behave differently.

## Sponsor tools

**Fireworks** receives the package evidence and proposes a structured correction to the appropriate dependency file. Native package managers resolve the final version and update the lockfile.

**Daytona** creates a fresh computer with none of the team’s leftover project packages. IWOMC installs the project using only its saved dependency files and runs its expected checks. This proves that a new developer can clone and run the project without copying anREDACTED teammate’s environment.

**Braintrust** connects each Fireworks recommendation to its Daytona result. Failed recommendations become evaluation cases, helping us improve package suggestions as models and package adapters change.

## Package coverage

IWOMC provides native understanding for npm, pip, and uv, including their manifests and lockfiles.

Its package registry also discovers Poetry, Conda, pnpm, Yarn, Bun, Cargo, vcpkg, and Conan projects. Each package manager receives a visible support level based on what IWOMC can safely understand and verify.

## Impact

**IWOMC makes package setup collaborative. Code can move between developers, AI tools, and computers without leaving required packages behind.**
