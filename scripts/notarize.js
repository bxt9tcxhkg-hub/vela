// Notarisierung für macOS – läuft automatisch nach electron-builder
// Benötigt: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID in Umgebung/GitHub Secrets
const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') return

  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  // Nur notarisieren wenn Credentials vorhanden (CI/CD)
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log('[notarize] Skipping – APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD not set')
    return
  }

  console.log(`[notarize] Notarisiere ${appPath}...`)

  await notarize({
    tool:       'notarytool',
    appPath,
    appleId:       process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId:        process.env.APPLE_TEAM_ID,
  })

  console.log('[notarize] ✓ Fertig')
}
