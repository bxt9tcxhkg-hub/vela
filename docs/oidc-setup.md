# OIDC Setup Guide — Vela Enterprise SSO

Vela supports OpenID Connect (OIDC) for enterprise single sign-on via any compliant provider (Google, Azure AD, Okta, Auth0, etc.).

## Environment Variables

Set the following environment variables before starting the Vela server:

| Variable | Description | Example |
|---|---|---|
| `OIDC_ISSUER` | The OIDC provider's issuer URL | `https://accounts.google.com` |
| `OIDC_CLIENT_ID` | Your app's client ID from the provider | `123456.apps.googleusercontent.com` |
| `OIDC_CLIENT_SECRET` | Your app's client secret | `GOCSPX-...` |
| `OIDC_REDIRECT_URI` | Callback URL (must match provider config) | `https://yourvela.example.com/api/auth/oidc/callback` |

## Google as Provider

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add `OIDC_REDIRECT_URI` to **Authorized redirect URIs**
4. Copy the Client ID and Client Secret
5. Set env vars:
   ```
   OIDC_ISSUER=https://accounts.google.com
   OIDC_CLIENT_ID=<your-client-id>
   OIDC_CLIENT_SECRET=<your-client-secret>
   OIDC_REDIRECT_URI=https://yourvela.example.com/api/auth/oidc/callback
   ```

## Azure AD as Provider

1. Go to [Azure Portal](https://portal.azure.com/) → Azure Active Directory → App registrations
2. Create a new registration, add the redirect URI
3. Under **Certificates & secrets**, create a new client secret
4. Find your **Tenant ID** in the Overview
5. Set env vars:
   ```
   OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
   OIDC_CLIENT_ID=<application-client-id>
   OIDC_CLIENT_SECRET=<client-secret-value>
   OIDC_REDIRECT_URI=https://yourvela.example.com/api/auth/oidc/callback
   ```

## Flow

1. User visits `/api/auth/oidc/login` → redirected to provider
2. User authenticates with provider → redirected back to `/api/auth/oidc/callback`
3. Vela exchanges the code for tokens, fetches user info, upserts the user in the database
4. Vela issues its own JWT and redirects to `/?token=<jwt>`
5. Frontend stores the token and uses it for subsequent API calls

## Checking Status

```
GET /api/auth/oidc/config
→ { "enabled": true, "issuer": "https://accounts.google.com" }
```
