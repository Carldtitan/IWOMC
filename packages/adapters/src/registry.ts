import type {
  AdapterManifest,
  ObservedOnlyProfile,
  RepositoryAdapter,
  RepositorySnapshot
} from "./types.js";

export class AdapterRegistry {
  readonly #repositoryAdapters = new Map<string, RepositoryAdapter<RepositorySnapshot>>();
  readonly #observedOnly = new Map<string, ObservedOnlyProfile>();

  registerRepositoryAdapter<TSnapshot extends RepositorySnapshot>(
    adapter: RepositoryAdapter<TSnapshot>
  ): void {
    const manager = adapter.manifest.manager;
    if (this.#repositoryAdapters.has(manager)) {
      throw new Error(`Repository adapter already registered: ${manager}`);
    }
    this.#repositoryAdapters.set(manager, adapter);
  }

  registerObservedOnly(profile: ObservedOnlyProfile): void {
    if (this.#observedOnly.has(profile.manager)) {
      throw new Error(`Observed-only profile already registered: ${profile.manager}`);
    }
    this.#observedOnly.set(profile.manager, Object.freeze(profile));
  }

  manifest(manager: string): AdapterManifest | undefined {
    return this.#repositoryAdapters.get(manager)?.manifest;
  }

  repositoryAdapter(manager: string): RepositoryAdapter<RepositorySnapshot> | undefined {
    return this.#repositoryAdapters.get(manager);
  }

  observedOnlyProfile(manager: string): ObservedOnlyProfile | undefined {
    return this.#observedOnly.get(manager);
  }
}

export const observedOnlyProfiles: readonly ObservedOnlyProfile[] = Object.freeze([
  profile("bun", ["bun.lock", "bun.lockb"]),
  profile("cargo", ["Cargo.toml", "Cargo.lock"]),
  profile("cmake", ["CMakeLists.txt"]),
  profile("conda", ["environment.yml", "environment.yaml"]),
  profile("conan", ["conanfile.py", "conanfile.txt"]),
  profile("container", ["Dockerfile", "docker-compose.yml", "compose.yml"]),
  profile("devcontainer", [".devcontainer/devcontainer.json"]),
  profile("html-css", ["*.html", "*.css"]),
  profile("pnpm", ["pnpm-lock.yaml", "pnpm-workspace.yaml"]),
  profile("poetry", ["poetry.lock"]),
  profile("vcpkg", ["vcpkg.json"]),
  profile("yarn", ["yarn.lock"])
]);

function profile(manager: string, fileNames: readonly string[]): ObservedOnlyProfile {
  return Object.freeze({
    manager,
    fileNames: Object.freeze([...fileNames]),
    supportLevel: "observed_only" as const
  });
}
