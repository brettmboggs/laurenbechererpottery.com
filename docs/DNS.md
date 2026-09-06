# DNS — pointing laurenbechererpottery.com at GitHub Pages

Do this in Namecheap: **Domain List → Manage → Advanced DNS**.

Delete any existing records of type A, AAAA, CNAME, or URL Redirect for `@` and
`www` (Namecheap adds a parking-page redirect by default), then add:

| Type  | Host | Value                                | TTL       |
| ----- | ---- | ------------------------------------ | --------- |
| A     | @    | 185.199.108.153                      | Automatic |
| A     | @    | 185.199.109.153                      | Automatic |
| A     | @    | 185.199.110.153                      | Automatic |
| A     | @    | 185.199.111.153                      | Automatic |
| AAAA  | @    | 2606:50c0:8000::153                  | Automatic |
| AAAA  | @    | 2606:50c0:8001::153                  | Automatic |
| AAAA  | @    | 2606:50c0:8002::153                  | Automatic |
| AAAA  | @    | 2606:50c0:8003::153                  | Automatic |
| CNAME | www  | brettmboggs.github.io.               | Automatic |

Leave any MX / TXT records alone if you later set up email on the domain.

## Then, in GitHub

The repo is already configured with the custom domain (the `public/CNAME` file
and the Pages setting). Once DNS has propagated (usually 10–60 minutes, up to
24 h), go to the repo → **Settings → Pages**:

1. It should show "DNS check successful".
2. Tick **Enforce HTTPS** (the option becomes available after GitHub issues the certificate, which can take a few minutes after the DNS check passes).

`www.laurenbechererpottery.com` automatically redirects to the apex domain.

## Checking propagation

```bash
nslookup laurenbechererpottery.com
```

should list the four `185.199.x.153` addresses. https://dnschecker.org shows it worldwide.

## Optional: email on the domain

If you want `hello@laurenbechererpottery.com`, the cheapest routes are
Cloudflare Email Routing (free forwarding to a Gmail address; requires moving
DNS to Cloudflare) or Namecheap's own email forwarding under **Domain → Redirect
Email**. Update the contact email in *Site settings* in the admin afterwards.
