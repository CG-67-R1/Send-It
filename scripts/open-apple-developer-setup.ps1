# Opens the Apple / Expo pages needed for RoadRacer registration (manual assist).
# Does not create resources; use register-apple-app.mjs after you have an ASC API key.

$ErrorActionPreference = 'Stop'

$urls = @(
  'https://developer.apple.com/account#/membership',
  'https://developer.apple.com/account/resources/identifiers/list',
  'https://appstoreconnect.apple.com/apps',
  'https://appstoreconnect.apple.com/access/integrations/api',
  'https://expo.dev/settings/access-tokens'
)

Write-Host 'RoadRacer Apple setup: confirm membership (Individual vs Organization) on the Membership page.'
Write-Host 'Seller/developer name = membership entity. Do NOT use a Development profile as the public name.'
Write-Host ''
Write-Host 'Bundle ID to register: com.milroadracer.app (Explicit) + Push Notifications'
Write-Host 'ASC app name: RoadRacer - Motorsport_Is_Life | SKU: roadracer-ios-001 | Locale: en-AU'
Write-Host ''

foreach ($u in $urls) {
  Write-Host "Opening $u"
  Start-Process $u
}

Write-Host ''
Write-Host 'After creating an App Store Connect API key (Admin), set env from docs/ios/apple-credentials.env.example'
Write-Host 'then run:'
Write-Host '  node scripts/register-apple-app.mjs'
Write-Host '  node scripts/setup-eas-ios-credentials.mjs'
