[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Api', 'Worker', 'Idp', 'Frontend')][string]$Service,
    [string]$ConfigPath = 'D:/BotSalesAI/config/windows-pilot.json',
    [string]$EnvironmentFile
)

$ErrorActionPreference = 'Stop'
if (!$EnvironmentFile) {
    $settings = Get-Content -Raw -LiteralPath $ConfigPath | ConvertFrom-Json
    $EnvironmentFile = $settings.activeEnvironmentFile
}
if (!$EnvironmentFile) { throw 'Specify the pilot environment file or set activeEnvironmentFile in the Windows pilot configuration' }
$profilePath = (Resolve-Path -LiteralPath $EnvironmentFile).Path
$backend = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$entrypoint = @{
    Api = 'apps/api/dist/main.js'
    Worker = 'apps/worker/src/main.mjs'
    Idp = 'infra/p0/oidc/idp.mjs'
    Frontend = 'infra/p0/oidc/dev-live.mjs'
}[$Service]

$profileKeys = 'DATABASE_URL', 'MIGRATION_DATABASE_URL', 'BOTSALES_SUPABASE_PROJECT_REF', 'NODE_EXTRA_CA_CERTS'
$previous = @{}
Push-Location -LiteralPath $backend
try {
    foreach ($key in $profileKeys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue
    }
    # Node reads the trust bundle at process startup.
    $caPath = & node "--env-file=$profilePath" -p 'process.env.NODE_EXTRA_CA_CERTS'
    if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $caPath -PathType Leaf)) {
        throw 'The pilot needs its local HTTPS CA file'
    }
    $env:NODE_EXTRA_CA_CERTS = $caPath
    & node "--env-file=$profilePath" $entrypoint
    $exitCode = $LASTEXITCODE
} finally {
    foreach ($key in $previous.Keys) {
        if ($null -eq $previous[$key]) {
            Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process')
        }
    }
    Pop-Location
}
exit $exitCode
