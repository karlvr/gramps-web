# The `edge` branch

`edge` is a long-lived downstream branch that carries patches not yet in upstream
Gramps Web, together with a pipeline that publishes Docker images from them.

## What is on it

`edge` is `main` plus the feature branches that are currently in flight, merged with
`--no-ff`. The set changes as branches land upstream, so the merge commits on `edge`
are the record of what is on it:

```sh
git log --merges --oneline main..edge
```

The companion backend branch lives in [gramps-web-api](https://github.com/karlvr/gramps-web-api)
and is also called `edge`; it is `master` plus that repository's in-flight branches.

## Images

| Image | Built from | Contents |
| ----- | ---------- | -------- |
| `ghcr.io/karlvr/gramps-web-api:edge` | gramps-web-api `edge`, `Dockerfile` | Patched backend, on upstream's `gramps-web-base:latest` |
| `ghcr.io/karlvr/grampsweb:edge` | gramps-web `edge`, `Dockerfile.edge` | The above, with the patched frontend baked into `/app/static` |

Each build also pushes an immutable `edge-<short-sha>` tag, so a deployment can be
pinned or rolled back. Both images are `linux/amd64` and `linux/arm64`.

The base image is **not** rebuilt here — it is pulled from
`ghcr.io/gramps-project/gramps-web-base:latest`, so builds take minutes rather than
hours.

## How a build is triggered

```
push to gramps-web-api edge  ──▶  build gramps-web-api:edge
                                        │
                                        ▼  (workflow_dispatch, needs EDGE_DISPATCH_TOKEN)
push to gramps-web edge      ──▶  build grampsweb:edge
```

Pushing to `edge` in either repository rebuilds that repository's image. Because
`grampsweb` is layered on `gramps-web-api`, a backend push also asks the frontend
repository to rebuild, so the combined image picks up the new backend.

Both workflows also accept `workflow_dispatch`, so a rebuild can be forced from the
Actions tab or with:

```sh
gh workflow run image-edge.yml --repo karlvr/gramps-web --ref edge
```

## One-time setup

1. **Cross-repo trigger.** Create a fine-grained personal access token with
   *Actions: read and write* on `karlvr/gramps-web`, and add it to
   `karlvr/gramps-web-api` as the repository secret `EDGE_DISPATCH_TOKEN`.
   Without it the backend build still publishes; it just prints the `gh workflow run`
   command instead of triggering the frontend rebuild.

2. **Package visibility.** The first build creates the GHCR packages as *private*.
   `gramps-web`'s build must pull `gramps-web-api:edge`, and `GITHUB_TOKEN` cannot read
   another repository's private package. Either make both packages public
   (simplest), or, in each package's settings, grant the other repository read access.

3. **Actions on the fork.** Confirm Actions are enabled for the fork —
   forks have workflows disabled until they are explicitly turned on.

## Deploying

Replace the upstream image in `docker-compose.yml` — in both the `grampsweb` and
`grampsweb_celery` services, which must run the same image:

```yaml
services:
  grampsweb:
    image: ghcr.io/karlvr/grampsweb:edge
  grampsweb_celery:
    image: ghcr.io/karlvr/grampsweb:edge
```

Pin to an `edge-<short-sha>` tag instead if a build should not change under the
deployment.

## Keeping `edge` current

`edge` is never rebased — the merge commits are what make repeated updates cheap:

```sh
git checkout edge
git merge --no-ff main
git merge --no-ff <feature-branch>...
git push origin edge
```

Feature branches themselves stay based on `main` so they remain usable as upstream
pull requests. Once one is merged upstream it no longer needs merging into `edge`.

## Toolchain

`mise.toml` pins Node for local development and for the edge workflow, which sets the
toolchain up with `jdx/mise-action`. The npm scripts in `package.json` are unchanged
and are still the way to run builds, lint, and tests:

```sh
mise install         # once
npm ci
npm run build
```
