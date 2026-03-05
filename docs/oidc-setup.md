# OIDC / SSO Setup

Vela unterstützt OpenID Connect (OIDC) für Enterprise Single Sign-On.
Damit können sich Nutzer via Google, Azure AD, Okta oder einem anderen OIDC-Provider anmelden.

## Umgebungsvariablen

| Variable              | Beschreibung                                      | Beispiel                                           |
|-----------------------|---------------------------------------------------|----------------------------------------------------|
| `OIDC_ISSUER`         | Issuer URL des Providers                         | `https://accounts.google.com`                      |
| `OIDC_CLIENT_ID`      | Client ID der registrierten App                  | `123456-abc.apps.googleusercontent.com`            |
| `OIDC_CLIENT_SECRET`  | Client Secret                                    | `GOCSPX-...`                                       |
| `OIDC_REDIRECT_URI`   | Callback-URL (muss beim Provider registriert sein)| `https://vela.example.com/api/auth/oidc/callback` |

## Google als Provider

1. Gehe zu <https://console.cloud.google.com/apis/credentials>
2. **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized redirect URIs: `https://deine-domain/api/auth/oidc/callback`
5. Client ID und Secret in `.env` eintragen:

```env
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>
OIDC_REDIRECT_URI=https://deine-domain/api/auth/oidc/callback
```

## Azure AD als Provider

1. Gehe zu <https://portal.azure.com> → **Azure Active Directory → App registrations → New**
2. Redirect URI: `https://deine-domain/api/auth/oidc/callback`
3. Unter **Certificates & secrets**: neues Client Secret erstellen
4. Issuer URL: `https://login.microsoftonline.com/<tenant-id>/v2.0`

```env
OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
OIDC_CLIENT_ID=<application-id>
OIDC_CLIENT_SECRET=<secret>
OIDC_REDIRECT_URI=https://deine-domain/api/auth/oidc/callback
```

## Login-Flow

```
Nutzer → GET /api/auth/oidc/login
       → Redirect zum Provider
       → Nutzer meldet sich an
       → Redirect zu /api/auth/oidc/callback?code=...
       → Vela erstellt/aktualisiert User
       → Redirect zu /?token=<jwt>
```

## Status prüfen

```bash
curl https://deine-domain/api/auth/oidc/config
# { "enabled": true, "issuer": "https://accounts.google.com" }
```
