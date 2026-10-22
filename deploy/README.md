# Hostinger deployment

Production: https://ahmed-esmail.tech (`www` redirects to the root domain).

The site is a Next.js static export. Docker builds the complete `out/` directory, runs the existing performance/preview tests and Next build checks, and serves the export using unprivileged Caddy. No database or Next.js development server is needed. The container is bound only to `127.0.0.1:3030`; the existing host Nginx handles public HTTPS. Other applications use independent sites and Compose projects.

## Initial setup

Point the root A record to `186.240.155.111` and `www` CNAME to `ahmed-esmail.tech`. Remove conflicting A/AAAA records for these names; preserve mail and other subdomain records.

Create `/opt/ahmed-portfolio/{incoming,releases}` owned by the deployment account. Authorize a dedicated CI public key for that account; Docker access is root-equivalent. Install `nginx-http.conf` as a new Nginx site, create `/var/www/ahmed-portfolio-acme`, test `nginx -t` and reload. Once DNS resolves, use Certbot webroot to issue a certificate for both names. Install `nginx.conf`, test and reload again. Certbot renewal must reload Nginx; the VPS already has a tested renewal hook.

Configure the GitHub `production` environment, restricted to `main`, with `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, and verified `VPS_KNOWN_HOSTS` secrets. Enable repository variable `DEPLOY_ENABLED=true` after the server and HTTPS are ready.

Every push to `main` builds and smoke-tests the production container, packages that exact image, transfers it over SSH, and deploys it. Pull requests only run checks. Successful deployments update `/opt/ahmed-portfolio/current`. A failed deployment attempts to restore the previous image. This uses brief container replacement downtime.

## Operations

```sh
cd /opt/ahmed-portfolio/current
export IMAGE_TAG=$(basename "$(pwd -P)")
docker compose -f deploy/compose.yml ps
docker compose -f deploy/compose.yml logs --tail=100
```

Retain the previous release image for rollback. To roll back, run Compose from that release with its SHA as `IMAGE_TAG`, verify the public site, then update `current`. No runtime application data is stored in the container; content changes require a rebuild. Do not run global Docker cleanup commands on this shared VPS.
