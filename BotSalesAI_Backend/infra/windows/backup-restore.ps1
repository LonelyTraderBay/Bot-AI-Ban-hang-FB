[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Bin,
    [Parameter(Mandatory)][string]$RunDirectory,
    [Parameter(Mandatory)][ValidateRange(1024, 65535)][int]$SourcePort,
    [Parameter(Mandatory)][ValidateRange(1024, 65535)][int]$RestorePort,
    [string]$BackupDirectory,
    [string]$RestoreRunDirectory
)

$ErrorActionPreference = 'Stop'
if ($SourcePort -eq $RestorePort) {
    throw 'Source and restore must be separate PostgreSQL clusters'
}
if ([string]::IsNullOrWhiteSpace($env:BOTSALES_DB_ADMIN_PASSWORD)) {
    throw 'Set BOTSALES_DB_ADMIN_PASSWORD for the two BotSales fixture clusters'
}

$Bin = (Resolve-Path -LiteralPath $Bin).Path
$RunDirectory = (Resolve-Path -LiteralPath $RunDirectory).Path
$sourceRun = $RunDirectory
if (!$RestoreRunDirectory) { $RestoreRunDirectory = $sourceRun }
$RestoreRunDirectory = (Resolve-Path -LiteralPath $RestoreRunDirectory).Path
if (!$BackupDirectory) { $BackupDirectory = $sourceRun }
$BackupDirectory = (Resolve-Path -LiteralPath $BackupDirectory).Path
$capture = Join-Path $BackupDirectory "restore-$SourcePort-to-$RestorePort"
if (Test-Path -LiteralPath $capture) {
    throw "Restore evidence already exists at $capture"
}
$compareSql = Join-Path $PSScriptRoot '../backup/verify-restore.sql'
$compareReport = Join-Path $PSScriptRoot '../backup/check-restore-evidence.mjs'

function Invoke-Tool([string]$Name, [string[]]$Arguments) {
    & $Name @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Name exited with code $LASTEXITCODE"
    }
}

function Connection([int]$Port) {
    @('-h', '127.0.0.1', '-p', "$Port", '-U', 'botsales_admin', '-d', 'botsales_be_dev', '--no-password')
}

function Assert-FixtureCluster([int]$Port, [string]$Directory) {
    $data = Join-Path $Directory "postgres-$Port"
    if (!(Test-Path -LiteralPath (Join-Path $data 'botsales-windows-fixture'))) {
        throw "Port $Port has no BotSales Windows fixture marker in $Directory"
    }
    $actual = Invoke-Tool (Join-Path $Bin 'psql.exe') ((Connection $Port) + @('-XAtq', '-c', 'SHOW data_directory'))
    if ([IO.Path]::GetFullPath($actual) -ne [IO.Path]::GetFullPath($data)) {
        throw "Port $Port belongs to a different data directory"
    }
}

$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = $env:BOTSALES_DB_ADMIN_PASSWORD
    Assert-FixtureCluster $SourcePort $sourceRun
    Assert-FixtureCluster $RestorePort $RestoreRunDirectory
    $source = Connection $SourcePort
    $target = Connection $RestorePort
    $psql = Join-Path $Bin 'psql.exe'
    $schemaCount = Invoke-Tool $psql ($target + @('-XAtq', '-c', "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'"))
    if ($schemaCount -ne '0') {
        throw 'Restore target must have a fresh public schema'
    }

    New-Item -ItemType Directory -Path $capture | Out-Null
    $sourceReport = Join-Path $capture 'source.json'
    $targetReport = Join-Path $capture 'restored.json'
    $archive = Join-Path $capture 'database.dump'
    $clock = [Diagnostics.Stopwatch]::StartNew()
    Invoke-Tool (Join-Path $Bin 'pg_dump.exe') ($source + @('--format=custom', '--file', $archive))
    $dumpMs = $clock.ElapsedMilliseconds
    $dumpHash = (Get-FileHash -LiteralPath $archive).Hash.ToLowerInvariant()
    Invoke-Tool $psql ($source + @('-XAtq', '-f', $compareSql, '-o', $sourceReport))
    $sourceHash = (Get-FileHash -LiteralPath $sourceReport).Hash.ToLowerInvariant()

    if ((Get-FileHash -LiteralPath $archive).Hash -ne $dumpHash) {
        throw 'Dump hash changed before restore'
    }
    $clock.Restart()
    Invoke-Tool (Join-Path $Bin 'pg_restore.exe') ($target + @('--exit-on-error', '--single-transaction', $archive))
    $restoreMs = $clock.ElapsedMilliseconds
    Invoke-Tool $psql ($target + @('-XAtq', '-f', $compareSql, '-o', $targetReport))
    Invoke-Tool node @($compareReport, $sourceReport, $targetReport, $sourceHash)
    [ordered]@{ backupSha256 = $dumpHash; dumpMs = $dumpMs; restoreMs = $restoreMs } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $capture 'timings.json') -Encoding utf8NoBOM
} finally {
    $env:PGPASSWORD = $previousPassword
}
