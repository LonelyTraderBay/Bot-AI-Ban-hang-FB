[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Start', 'Stop')][string]$Action,
    [Parameter(Mandatory)][string]$Bin,
    [Parameter(Mandatory)][string]$RunDirectory,
    [Parameter(Mandatory)][ValidateRange(1024, 65535)][int]$Port
)

$ErrorActionPreference = 'Stop'
$Bin = (Resolve-Path -LiteralPath $Bin).Path
$RunDirectory = (Resolve-Path -LiteralPath $RunDirectory).Path
$data = Join-Path $RunDirectory "postgres-$Port"
$ready = Join-Path $data 'botsales-windows-fixture'
$log = Join-Path $RunDirectory "postgres-$Port.log"
$database = 'botsales_be_dev'
$admin = 'botsales_admin'

function Invoke-PostgresTool([string]$Name, [string[]]$Arguments) {
    & (Join-Path $Bin "$Name.exe") @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Name exited with code $LASTEXITCODE"
    }
}

function Start-Postgres {
    # Redirect to files so the background server cannot retain a caller's output pipe.
    $process = Start-Process -FilePath (Join-Path $Bin 'pg_ctl.exe') -PassThru -WindowStyle Hidden `
        -ArgumentList @('start', '-D', ('"' + $data + '"'), '-l', ('"' + $log + '"'), '-w', '-t', '20') `
        -RedirectStandardOutput "$log.start-out" -RedirectStandardError "$log.start-error"
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
        throw "pg_ctl exited with code $($process.ExitCode). See $log and $log.start-error"
    }
}

if ($Action -eq 'Stop') {
    if (!(Test-Path -LiteralPath $ready)) {
        throw "No BotSales Windows fixture at $data"
    }
    & (Join-Path $Bin 'pg_ctl.exe') status -D $data
    if ($LASTEXITCODE -eq 0) {
        Invoke-PostgresTool pg_ctl @('stop', '-D', $data, '-m', 'fast', '-w')
    } elseif ($LASTEXITCODE -ne 3) {
        throw "Could not determine PostgreSQL status in $data"
    }
    return
}

if (Test-Path -LiteralPath $ready) {
    Start-Postgres
    return
}
if (Test-Path -LiteralPath $data) {
    throw "Use a fresh run directory. A PostgreSQL data path already exists at $data"
}
foreach ($key in 'BOTSALES_DB_ADMIN_PASSWORD', 'BOTSALES_DB_MIGRATION_PASSWORD', 'BOTSALES_DB_RUNTIME_PASSWORD') {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key))) {
        throw "Set $key for the new fixture"
    }
}

$passwordFile = Join-Path $RunDirectory ([IO.Path]::GetRandomFileName())
try {
    Set-Content -LiteralPath $passwordFile -Value $env:BOTSALES_DB_ADMIN_PASSWORD -Encoding utf8NoBOM
    Invoke-PostgresTool initdb @('-D', $data, '-U', $admin, '--auth=scram-sha-256',
        '--encoding=UTF8', '--locale=C', "--pwfile=$passwordFile")
} finally {
    if (Test-Path -LiteralPath $passwordFile) {
        Remove-Item -LiteralPath $passwordFile
    }
}
Add-Content -LiteralPath (Join-Path $data 'postgresql.conf') -Encoding utf8NoBOM -Value @(
    "listen_addresses = '127.0.0.1'", "port = $Port", "timezone = 'UTC'", "log_timezone = 'UTC'"
)
Start-Postgres

$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = $env:BOTSALES_DB_ADMIN_PASSWORD
    $connection = @('-h', '127.0.0.1', '-p', "$Port", '-U', $admin)
    Invoke-PostgresTool createdb ($connection + @('--no-password', $database))
    Invoke-PostgresTool psql ($connection + @('-X', '--no-password', '-d', $database,
        '-f', (Join-Path $PSScriptRoot '../p0/bootstrap.sql')))
    New-Item -ItemType File -Path $ready | Out-Null
} catch {
    Invoke-PostgresTool pg_ctl @('stop', '-D', $data, '-m', 'fast', '-w')
    throw
} finally {
    $env:PGPASSWORD = $previousPassword
}
