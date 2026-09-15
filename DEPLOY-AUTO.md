# Automatic deploy

Push to `main` on GitHub -> the site at **https://vote.zeeshanfarooq.site** updates itself.

```
your PC  --git push-->  GitHub  --SSH-->  Namecheap server
                         |
                    builds React, then ships backend/ over SSH
```

The runner does the work. The server never talks to GitHub, so **no deploy key and no
GitHub token is stored on the server** — only one SSH key, used one direction.

---

## One-time setup

Do all five steps before pushing. If you push first, the workflow runs and fails at the
SSH step; it cannot damage the site, but you will get a red X email.

### Step 1 — Back up the live files

Over SSH:

```bash
cd ~/vote.zeeshanfarooq.site
cp .env .env.bak
cp public/index.php public/index.php.bak
cp public/.htaccess public/.htaccess.bak
```

The deploy overwrites `index.php` and `.htaccess` with the copies from your repo. That
is intended, but the backup lets you undo it instantly if your host added its own rules.

### Step 2 — Create an SSH key on your PC

In `cmd.exe`:

```bat
ssh-keygen -t ed25519 -f "%USERPROFILE%\.ssh\njv_deploy" -C "github-actions-deploy" -N ""
```

Two files are created:

- `njv_deploy` — **private**, goes to GitHub. Never share or commit it.
- `njv_deploy.pub` — **public**, goes to the server.

Print the public one:

```bat
type "%USERPROFILE%\.ssh\njv_deploy.pub"
```

### Step 3 — Give the server the public key

In **cPanel -> SSH Access -> Manage SSH Keys -> Import Key**:

- Paste the whole `ssh-ed25519 AAAA... github-actions-deploy` line
- Name it `github-actions`
- After importing, click **Manage** next to it and choose **Authorize**

Confirm the key is listed as *authorized*. Without that second click the key is inert.

### Step 4 — Add the secrets in GitHub

Repo -> **Settings -> Secrets and variables -> Actions -> New repository secret**.

| Name | Value |
| --- | --- |
| `SSH_HOST` | the host you already SSH to — **no** `https://`, no trailing slash |
| `SSH_USER` | your cPanel username (the same one you SSH in with) |
| `SSH_PORT` | your SSH port — cPanel -> SSH Access shows it. Namecheap is usually `21098`, **not** 22 |
| `SSH_PRIVATE_KEY` | the full contents of `njv_deploy`, including the `BEGIN`/`END` lines |

To copy the private key:

```bat
type "%USERPROFILE%\.ssh\njv_deploy"
```

Copy **everything**, starting at `-----BEGIN OPENSSH PRIVATE KEY-----`.

`SSH_HOST`, `SSH_USER` and `SSH_PORT` are exactly the values from the command you
already run, e.g. `ssh -p 21098 zeesyswc@server123.web-hosting.com`.

### Step 5 — Push

```bat
git add -A
git commit -m "Add automatic deploy workflow"
git push
```

Watch it under the repo's **Actions** tab. First run takes 2-3 minutes, mostly `npm ci`.

---

## What gets deployed

Only the `backend/` folder, copied into `~/vote.zeeshanfarooq.site/`.

The React app is compiled on the runner and arrives already built inside
`backend/public/`, so **you never need Node on the server**.

## What is never touched

| Path | Why |
| --- | --- |
| `.env` | live database credentials |
| `vendor/` | installed on the server by composer |
| `storage/` | logs, sessions, compiled views |
| `public/uploads/candidates/` | student photos uploaded at runtime |
| `public/index.php` | present, but overwritten — see Step 1 backup |

Files are added and overwritten, never deleted. Old build files stay in
`public/assets/` and are harmless.

## After each deploy

The workflow runs:

```
php artisan optimize:clear
php artisan migrate --force
chmod -R 775 storage bootstrap/cache
```

`migrate --force` only applies *pending* migrations, so it is a no-op most of the time.
It is there so schema changes do not silently break the site. If you would rather run
migrations by hand, delete that step from `.github/workflows/deploy.yml`.

## Known limits

- **New composer packages** are not installed. `vendor/` is excluded, so if you add a
  package you must run `composer install` on the server once. Check whether composer is
  available with `composer --version`.
- **The deploy path is hard-coded** as `~/vote.zeeshanfarooq.site` in `deploy.yml`. If
  your server layout ever changes, update both `-C ~/vote.zeeshanfarooq.site` and the
  `cd` in the last step.
- **Rolling back** is manual: `git revert` the bad commit and push, or restore the
  `.bak` files from Step 1.

## Turn it off

Delete `.github/workflows/deploy.yml`, or comment out the `push:` trigger so it only
runs from the Actions tab via **Run workflow**.
