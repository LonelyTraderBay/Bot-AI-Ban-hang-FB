$ErrorActionPreference = 'Continue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$logPath = Join-Path $PSScriptRoot 'S19-current-frontend-gates-20261003.log'
$records = [System.Collections.Generic.List[string]]::new()
$directFailures = 0
Push-Location $root

function Invoke-RecordedStep {
    param([string]$Name, [scriptblock]$Command, [bool]$ExpectedToPass = $true)

    $output = (& $Command 2>&1 | Out-String).TrimEnd()
    $exitCode = $LASTEXITCODE
    if ($null -eq $exitCode) { $exitCode = 0 }
    $records.Add("### $Name`nexit=$exitCode`n$output")
    if ($ExpectedToPass -and $exitCode -ne 0) { $script:directFailures++ }
    if (-not $ExpectedToPass -and $exitCode -eq 0) { $script:directFailures++ }
}

try {
    $records.Add("UI012 post-BotConfig alert-wrap frontend verification capture - 2026-10-03`nScope: React frontend + local synthetic MSW; no Backend/CI/staging/owner UAT claim.`nNode: $(& node --version); npm: $(& npm.cmd --version).")
    Invoke-RecordedStep 'Composite npm verify wrapper (environment probe; expected unavailable)' { & npm.cmd run verify } $false
    Invoke-RecordedStep 'Required npm generate:check wrapper (environment probe; expected unavailable)' { & npm.cmd run generate:check } $false
    Invoke-RecordedStep 'Generator check - direct project entry point' { & node scripts/generate.mjs --check }
    Invoke-RecordedStep 'Source audit' { & node scripts/check-source.mjs }
    Invoke-RecordedStep 'Source checker negative/positive fixtures' { & node --test tests/source-checker.test.mjs }
    Invoke-RecordedStep 'Module boundaries and cycle checks' { & node scripts/check-boundaries.mjs }
    Invoke-RecordedStep 'ESLint' { & node node_modules/eslint/bin/eslint.js apps/web/src --max-warnings 0 }
    Invoke-RecordedStep 'TypeScript' { & node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit }
    Invoke-RecordedStep 'Domain and MSW checks' { & node scripts/test-domain.mjs }
    Invoke-RecordedStep 'Vitest suite' { & node node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts }
    Invoke-RecordedStep 'Production Vite build' {
        Push-Location apps/web
        try { & node ../../node_modules/vite/bin/vite.js build --mode production }
        finally { Pop-Location }
    }
    Invoke-RecordedStep 'Demo Vite build' {
        Push-Location apps/web
        try { & node ../../node_modules/vite/bin/vite.js build --mode demo --outDir dist-demo }
        finally { Pop-Location }
    }
    Invoke-RecordedStep 'Current production/demo artifact scan' { & node evidence/frontend-ui-improvements/UI012/S19-check-built-artifacts-20261003.mjs }

    $status = if ($directFailures -eq 0) { 'Direct checks PASS; composite npm wrappers NOT PASS in this shell.' } else { "Direct checks have $directFailures unexpected result(s)." }
    $records.Add("### Capture result`n$status")
    Set-Content -LiteralPath $logPath -Value ($records -join "`n`n") -Encoding utf8
    Write-Output ($records[-1])
    if ($directFailures -gt 0) { exit 1 }
}
finally {
    Pop-Location
}
