[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('BeforeRestart', 'AfterRestart')][string]$Phase,
    [Parameter(Mandatory)][string]$Config,
    [switch]$Rehearsal
)

$ErrorActionPreference = 'Stop'
$settings = Get-Content -LiteralPath $Config -Raw | ConvertFrom-Json
$root = $settings.runDirectory
$bundle = $settings.bundleRoot
$backend = Join-Path $settings.workspaceRoot 'BotSalesAI_Backend'
$pg = Join-Path $bundle 'tools/pgsql/bin'
$redis = Join-Path $bundle 'tools/redis/Redis-8.10.3-Windows-x64-msys2/redis-server.exe'
$weed = Join-Path $bundle 'tools/seaweed/weed.exe'
$clamd = Join-Path $bundle 'tools/clamav/clamav-1.5.5.win.x64/clamd.exe'
$before = Join-Path $root 'BeforeRestart.json'
$after = Join-Path $root 'AfterRestart.json'
$runtime = Join-Path $root 'fixture.json'
$state = Join-Path $root 'recovery-state.json'
$ports = @(3000, 5173, 9443, 7333, 8181, 9101, 23646, 33646, 44070, 44170, 44270, 44370, 44470,
    54070, 54170, 54270, 54370, 54470, 55780, 55782, 56780, 56980)
$started = [Collections.Generic.List[Diagnostics.Process]]::new()
$clusters = [Collections.Generic.List[int]]::new()

function Read-Network {
    $adapters = @(Get-NetAdapter -Physical | Select-Object Name, Status, InterfaceIndex)
    $connected = @(Get-NetIPInterface | Where-Object ConnectionState -eq 'Connected')
    $routes = @(Get-NetRoute -DestinationPrefix @('0.0.0.0/0', '::/0') -ErrorAction SilentlyContinue |
        Where-Object { $_.InterfaceIndex -in $connected.InterfaceIndex } |
        Select-Object InterfaceAlias, InterfaceIndex, DestinationPrefix)
    $up = @($adapters | Where-Object Status -eq 'Up')
    [ordered]@{ at = (Get-Date).ToString('o'); offline = (!$up.Count -and !$routes.Count); physical = $adapters; defaultRoutes = $routes }
}

function Assert-Network {
    $network = Read-Network
    if (!$Rehearsal -and !$network.offline) {
        $names = @($network.physical | Where-Object Status -eq 'Up' | ForEach-Object Name) -join ', '
        throw "Windows still has a connected network adapter or default route. Disconnect Internet and retry. Active physical adapters: $names"
    }
    $network
}

function Invoke-Step([string]$Name, [scriptblock]$Command) {
    $log = Join-Path $root "$Phase-$Name.txt"
    Write-Host "BE-WIN · $Name"
    & $Command *> $log
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE. See $log"
    }
}

function Start-OwnedService([string]$Name, [string]$Exe, [string[]]$Arguments, [int]$Port, [string]$Data) {
    if (!(Test-Path -LiteralPath $Data)) { New-Item -ItemType Directory -Path $Data | Out-Null }
    $process = Start-Process -FilePath $Exe -ArgumentList $Arguments -WorkingDirectory $Data -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $root "$Phase-$Name-out.txt") `
        -RedirectStandardError (Join-Path $root "$Phase-$Name-error.txt")
    $started.Add($process)
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($process.HasExited) { throw "$Name exited. Check its log in $root" }
        if (Get-NetTCPConnection -State Listen -OwningProcess $process.Id -LocalAddress 127.0.0.1 -LocalPort $Port -ErrorAction SilentlyContinue) {
            return $process
        }
        Start-Sleep -Milliseconds 250
    }
    throw "$Name did not open loopback port $Port"
}

function Start-Bucket([string]$Name) {
    $data = Join-Path $root $Name
    $s3 = Join-Path $root 's3.json'
    Start-OwnedService $Name $weed @('mini', '-ip=127.0.0.1', '-ip.bind=127.0.0.1', ('-dir="' + $data + '"'),
        '-master.port=44070', '-volume.port=44170', '-filer.port=44270', '-s3.port=44370',
        '-admin.port=44470', '-bucket=botsales-file-fixture', ('-s3.config="' + $s3 + '"'),
        '-volume.max=4', '-master.volumeSizeLimitMB=128', '-metricsPort=0') 44370 $data
}

function Set-Database([int]$Port) {
    $env:DATABASE_URL = "postgresql://botsales_runtime:$($fixture.BOTSALES_DB_RUNTIME_PASSWORD)@127.0.0.1:$Port/botsales_be_dev"
    $env:MIGRATION_DATABASE_URL = "postgresql://botsales_migrator:$($fixture.BOTSALES_DB_MIGRATION_PASSWORD)@127.0.0.1:$Port/botsales_be_dev"
}

function Start-Cluster([int]$Port) {
    & "$PSScriptRoot/postgres.ps1" -Action Start -Bin $pg -RunDirectory $root -Port $Port
    $clusters.Add($Port)
}

function Save-Receipt([string]$Path, [string]$Status) {
    $finishNetwork = Assert-Network
    [ordered]@{
        status = $Status
        phase = $Phase
        rehearsal = [bool]$Rehearsal
        boot = $boot
        runnerSha256 = $runnerHash
        preparedSha256 = $preparedHash
        networkAtStart = $startNetwork
        networkAtFinish = $finishNetwork
        clearedPorts = $ports
    } | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $Path -Encoding utf8NoBOM
    Write-Host "$Status · $Path"
}

$networkCheck = Assert-Network
$startNetwork = $networkCheck
$boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o')
$runnerHash = (Get-FileHash -LiteralPath $PSCommandPath).Hash
$preparedHash = (Get-FileHash -LiteralPath $settings.preparedManifest).Hash
foreach ($line in (Get-Content -LiteralPath $settings.preparedManifest)) {
    $hash, $path = $line -split "`t", 2
    if ((Get-FileHash -LiteralPath $path).Hash -ne $hash) { throw "Prepared file changed: $path" }
}
if (Get-ChildItem -LiteralPath $backend -Force -File | Where-Object { $_.Name -like '.env*' -and $_.Name -ne '.env.example' }) {
    throw 'The acceptance checkout must contain only the backend environment example'
}
if (Get-NetTCPConnection -State Listen -LocalPort $ports -ErrorAction SilentlyContinue) {
    throw 'An acceptance port is already in use. Existing processes were left alone.'
}

if ($Phase -eq 'BeforeRestart') {
    New-Item -ItemType Directory -Path $root | Out-Null
    $fixture = @{
        BOTSALES_DB_ADMIN_PASSWORD = [Guid]::NewGuid().ToString('N')
        BOTSALES_DB_MIGRATION_PASSWORD = [Guid]::NewGuid().ToString('N')
        BOTSALES_DB_RUNTIME_PASSWORD = [Guid]::NewGuid().ToString('N')
        OIDC_CLIENT_SECRET = [Guid]::NewGuid().ToString('N')
        AUTH_SIGNING_KEY = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
        FILE_OBJECT_STORE_SECRET_ACCESS_KEY = [Guid]::NewGuid().ToString('N')
    }
    $fixture | ConvertTo-Json | Set-Content -LiteralPath $runtime -Encoding utf8NoBOM
    @{ identities = @(@{
        name = 'botsales-offline-fixture'; actions = @('Admin', 'Read', 'Write', 'List', 'Tagging')
        credentials = @(@{ accessKey = 'botsales-offline-fixture'; secretKey = $fixture.FILE_OBJECT_STORE_SECRET_ACCESS_KEY })
    }) } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $root 's3.json') -Encoding utf8NoBOM
} else {
    $prior = Get-Content -LiteralPath $before -Raw | ConvertFrom-Json -DateKind String
    if ($prior.status -ne 'BE_WIN_BEFORE_OK' -or $prior.rehearsal -ne [bool]$Rehearsal -or
        $prior.runnerSha256 -ne $runnerHash -or $prior.preparedSha256 -ne $preparedHash) {
        throw 'BeforeRestart proof does not match this runner and bundle'
    }
    if (!$Rehearsal -and ([DateTimeOffset]::Parse($boot) -le [DateTimeOffset]::Parse($prior.boot) -or
        !$prior.networkAtStart.offline -or !$prior.networkAtFinish.offline)) {
        throw 'Windows has not rebooted after a successful offline BeforeRestart run'
    }
    if (Test-Path -LiteralPath $after) { throw "AfterRestart receipt already exists at $after" }
    $fixture = Get-Content -LiteralPath $runtime -Raw | ConvertFrom-Json -AsHashtable
}

Get-Content -LiteralPath (Join-Path $backend '.env.example') | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=') { [Environment]::SetEnvironmentVariable($Matches[1], $null) }
}
foreach ($key in $fixture.Keys) { [Environment]::SetEnvironmentVariable($key, $fixture[$key]) }
$env:PATH = (Split-Path $settings.nodeExe) + ';' + (Split-Path $settings.npmCommand) + ';' + $env:PATH
$env:PLAYWRIGHT_BROWSERS_PATH = $settings.browsers
$env:NODE_OPTIONS = '--import=' + [Uri]::new((Join-Path $backend 'infra/windows/require-loopback.mjs')).AbsoluteUri
$env:APP_ORIGIN = 'https://localhost:5173'
$env:OIDC_ISSUER = 'https://127.0.0.1:9443'
$env:OIDC_CLIENT_ID = 'botsales-p0-dev'
$env:OIDC_REDIRECT_URI = 'https://localhost:5173/api/v2/auth/callback'
$env:P0_TLS_CERT_FILE = Join-Path $settings.tls 'tls/local.crt'
$env:P0_TLS_KEY_FILE = Join-Path $settings.tls 'tls/local.key'
$env:NODE_EXTRA_CA_CERTS = Join-Path $settings.tls 'tls/ca.crt'
$env:P0_FIREFOX_TRUST_PROFILE = Join-Path $settings.tls 'browser'
$env:REDIS_URL = 'redis://127.0.0.1:56780'
$env:P0_CLAMD_PORT = '56980'
$env:OBJECT_STORE_FIXTURE_ADAPTER = '1'
$env:FILE_OBJECT_STORE_ENDPOINT = 'http://127.0.0.1:44370'
$env:FILE_OBJECT_STORE_REGION = 'us-east-1'
$env:FILE_OBJECT_STORE_BUCKET = 'botsales-file-fixture'
$env:FILE_OBJECT_STORE_ACCESS_KEY_ID = 'botsales-offline-fixture'
$env:FILE_OBJECT_STORE_TRANSFER_NEW_FILES = '1'
$env:MESSENGER_FIXTURE_ADAPTER = '1'
$env:AI_FIXTURE_ADAPTER = '1'
$env:NOTIFICATION_FIXTURE_ADAPTER = '1'

Push-Location -LiteralPath $backend
try {
    $clamConfig = Join-Path $root 'clamd.conf'
    @('Foreground yes', 'TCPAddr 127.0.0.1', 'TCPSocket 56980', ('DatabaseDirectory ' + (Join-Path $bundle 'clam-db'))) |
        Set-Content -LiteralPath $clamConfig -Encoding utf8NoBOM
    $null = Start-OwnedService 'clamd' $clamd @('--config-file="' + $clamConfig + '"') 56980 $root
    $null = Start-OwnedService 'redis' $redis @('--bind', '127.0.0.1', '--port', '56780', '--protected-mode',
        'yes', '--maxmemory-policy', 'noeviction', '--appendonly', 'no', '--save', '""') 56780 (Join-Path $root "redis-$Phase")

    if ($Phase -eq 'BeforeRestart') {
        Start-Cluster 55780
        Start-Cluster 55782
        Set-Database 55780
        $source = Start-Bucket 's3-source'
        $install = Join-Path $root 'offline-install'
        New-Item -ItemType Directory -Path "$install/apps/api", "$install/apps/worker" | Out-Null
        foreach ($path in '.npmrc', 'package.json', 'package-lock.json', 'apps/api/package.json', 'apps/worker/package.json') {
            Copy-Item -LiteralPath (Join-Path $backend $path) -Destination (Join-Path $install $path)
        }
        Push-Location -LiteralPath $install
        try { Invoke-Step 'offline-install' { & $settings.npmCommand ci --offline --no-audit --no-fund --cache $settings.npmCache } }
        finally { Pop-Location }

        foreach ($step in 'verify', 'db:migrate', 'db:migrate', 'db:seed', 'db:seed', 'test:postgres',
            'test:workspace', 'test:catalog', 'test:imports', 'test:events', 'test:jobs') {
            $label = $step.Replace(':', '-')
            if (Test-Path -LiteralPath (Join-Path $root "$Phase-$label.txt")) { $label += '-repeat' }
            Invoke-Step $label { & $settings.npmCommand run $step }
        }
        $env:P0_LOCAL_PILOT = '1'
        $env:FILE_SCAN_PORT = '56980'
        Invoke-Step 'pilot-seed' { & $settings.npmCommand run db:seed }
        Invoke-Step 'firefox' { & $settings.npmCommand run test:pilot:browser }
        Invoke-Step 'prepare-recovery' { & $settings.npmCommand run test:recovery:local -- prepare $state }
        Invoke-Step 'transfer-recovery-files' { node infra/windows/object-snapshot.mjs transfer }
        Invoke-Step 'backup-objects' { node infra/windows/object-snapshot.mjs backup (Join-Path $root 'object-backup') }
        Invoke-Step 'check-source-objects' { node scripts/check-object-storage.mjs }
        $null = Assert-Network
        Invoke-Step 'backup-restore-db' { & "$PSScriptRoot/backup-restore.ps1" -Bin $pg -RunDirectory $root -SourcePort 55780 -RestorePort 55782 }
        $source.Kill()
        $source.WaitForExit()

        $null = Start-Bucket 's3-restored'
        Set-Database 55782
        Invoke-Step 'restore-objects' { node infra/windows/object-snapshot.mjs restore (Join-Path $root 'object-backup') }
        Invoke-Step 'check-restored-objects' { node scripts/check-object-storage.mjs }
        $expected = Get-Content -LiteralPath (Join-Path $root "$Phase-check-source-objects.txt") -Raw | ConvertFrom-Json
        $actual = Get-Content -LiteralPath (Join-Path $root "$Phase-check-restored-objects.txt") -Raw | ConvertFrom-Json
        if ($expected.digest -ne $actual.digest -or $actual.mismatches -ne 0 -or $actual.checked -ne $expected.checked) {
            throw 'Restored object snapshot does not match the source'
        }
        Invoke-Step 'verify-queued' { & $settings.npmCommand run test:recovery:local -- verify-queued $state }
    } else {
        Start-Cluster 55782
        $null = Start-Bucket 's3-restored'
        Set-Database 55782
        $env:P0_LOCAL_PILOT = '1'
        $env:FILE_SCAN_PORT = '56980'
        Invoke-Step 'check-restored-objects' { node scripts/check-object-storage.mjs }
        $old = Get-Content -LiteralPath (Join-Path $root 'BeforeRestart-check-restored-objects.txt') -Raw | ConvertFrom-Json
        $current = Get-Content -LiteralPath (Join-Path $root "$Phase-check-restored-objects.txt") -Raw | ConvertFrom-Json
        if ($old.digest -ne $current.digest -or $old.checked -ne $current.checked -or $current.mismatches -ne 0) {
            throw 'Object digest changed after reboot'
        }
        Invoke-Step 'verify-queued' { & $settings.npmCommand run test:recovery:local -- verify-queued $state }
        Invoke-Step 'replay-exports' { & $settings.npmCommand run test:recovery:local -- verify-completed $state }
        Invoke-Step 'firefox' { & $settings.npmCommand run test:pilot:browser }
    }
} finally {
    Pop-Location
    foreach ($process in $started) {
        if (!$process.HasExited) { $process.Kill(); $process.WaitForExit() }
    }
    foreach ($port in $clusters) { & "$PSScriptRoot/postgres.ps1" -Action Stop -Bin $pg -RunDirectory $root -Port $port }
}
if (Get-NetTCPConnection -State Listen -LocalPort $ports -ErrorAction SilentlyContinue) {
    throw 'Not all acceptance ports were released'
}
if ($Phase -eq 'BeforeRestart') { Save-Receipt $before 'BE_WIN_BEFORE_OK' }
else { Save-Receipt $after 'BE_WIN_AFTER_OK' }
