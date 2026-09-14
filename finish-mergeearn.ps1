[CmdletBinding()]
param(
    [string]$AppUrl = "https://mergeearn-saidur-droids-projects.vercel.app",
    [string]$VercelProject = "mergeearn",
    [string]$VercelScope = "saidur-droids-projects",
    [string]$SupabaseProjectRef = "ppqvnxrcwsdltzpdcwat",
    [string]$SupabaseUrl = "https://ppqvnxrcwsdltzpdcwat.supabase.co",
    [string]$NimiqRpcUrl = "https://rpc.nimiqwatch.com",
    [switch]$SkipDeploy,
    [switch]$SkipHumanE2E
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version 2.0

$RepoName = "Saidur-droid/MergeEarn"
$GitHubOAuthSettingsUrl = "https://github.com/settings/developers"
$GitHubCallbackUrl = "$AppUrl/api/auth/github/callback"
$SupabaseApiSettingsUrl = "https://supabase.com/dashboard/project/$SupabaseProjectRef/settings/api"
$AiApiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
$AiModel = "gemini-3.8-flash"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Stop-Release([string]$Message) {
    Write-Host "[BLOCKED] $Message" -ForegroundColor Red
    exit 1
}

function Test-Command([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory=$true)][string]$Command,
        [string[]]$Arguments = @(),
        [switch]$Capture
    )

    if ($Capture) {
        $output = & $Command @Arguments 2>&1
        $code = $LASTEXITCODE
        if ($code -ne 0) {
            throw "Command failed ($code): $Command $($Arguments -join ' ')`n$($output -join [Environment]::NewLine)"
        }
        return ($output -join [Environment]::NewLine)
    }

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $Command $($Arguments -join ' ')"
    }
}

function Invoke-Vercel {
    param(
        [string[]]$Arguments,
        [switch]$Capture
    )
    $all = @("--yes", "vercel@latest") + $Arguments
    if ($Capture) {
        return Invoke-Checked -Command "npx" -Arguments $all -Capture
    }
    Invoke-Checked -Command "npx" -Arguments $all
}

function Get-VercelEnvText {
    return Invoke-Vercel -Arguments @("env", "ls", "production", "--scope", $VercelScope) -Capture
}

function Test-VercelEnv {
    param([string]$Name, [string]$EnvText)
    return $EnvText -match ("(?m)(^|\s)" + [Regex]::Escape($Name) + "(\s|$)")
}

function Remove-VercelEnv {
    param([string]$Name)
    try {
        Invoke-Vercel -Arguments @("env", "rm", $Name, "production", "--yes", "--scope", $VercelScope)
    } catch {
        # Ignore removal failures when the variable does not exist.
    }
}

function Set-VercelEnvPlain {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][string]$Value,
        [switch]$Overwrite
    )

    $envText = Get-VercelEnvText
    $exists = Test-VercelEnv -Name $Name -EnvText $envText
    if ($exists -and -not $Overwrite) {
        Write-Ok "$Name already exists in Vercel Production"
        return
    }
    if ($exists -and $Overwrite) {
        Remove-VercelEnv -Name $Name
    }

    $Value | & npx --yes vercel@latest env add $Name production --scope $VercelScope
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to add Vercel environment variable: $Name"
    }
    Write-Ok "$Name configured in Vercel Production"
}

function Set-VercelEnvSecure {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][Security.SecureString]$SecureValue
    )

    $ptr = [IntPtr]::Zero
    $plain = $null
    try {
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        Set-VercelEnvPlain -Name $Name -Value $plain
    } finally {
        if ($ptr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        }
        $plain = $null
    }
}

function New-RandomSecret {
    param([int]$Bytes = 48)
    $buffer = New-Object byte[] $Bytes
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($buffer)
        return [Convert]::ToBase64String($buffer)
    } finally {
        $rng.Dispose()
        [Array]::Clear($buffer, 0, $buffer.Length)
    }
}

function Test-SupabaseServiceKey {
    param([string]$Key)
    try {
        $headers = @{
            apikey = $Key
            Authorization = "Bearer $Key"
        }
        $null = Invoke-RestMethod -Method Get -Uri "$SupabaseUrl/rest/v1/users?select=id&limit=1" -Headers $headers -TimeoutSec 30
        return $true
    } catch {
        Write-Warn "Supabase service-role validation failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-NimiqRpc {
    Write-Step "Testing Nimiq RPC"
    $body = '{"jsonrpc":"2.0","id":1,"method":"getBlockNumber","params":[]}'
    try {
        $response = Invoke-RestMethod -Method Post -Uri $NimiqRpcUrl -ContentType "application/json" -Body $body -TimeoutSec 30
        if ($null -eq $response.result) {
            throw "RPC returned no result"
        }
        Write-Ok "Nimiq RPC getBlockNumber responded"
    } catch {
        Stop-Release "Nimiq RPC check failed: $($_.Exception.Message)"
    }
}

function Test-ProductionUrl {
    param([string]$Url)
    for ($attempt = 1; $attempt -le 18; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                return $true
            }
        } catch {
            Start-Sleep -Seconds 5
        }
    }
    return $false
}

function Test-OAuthRedirect {
    param([string]$Url)
    $request = [Net.HttpWebRequest]::Create($Url)
    $request.Method = "GET"
    $request.AllowAutoRedirect = $false
    $request.Timeout = 30000
    $response = $null
    try {
        try {
            $response = $request.GetResponse()
        } catch [Net.WebException] {
            $response = $_.Exception.Response
        }
        if ($null -eq $response) { return $false }
        $code = [int]$response.StatusCode
        $location = $response.Headers["Location"]
        return (($code -eq 302 -or $code -eq 307) -and $location -match "github\.com/login/oauth/authorize")
    } finally {
        if ($null -ne $response) { $response.Close() }
    }
}

function Get-LatestGitHubCi {
    try {
        $headers = @{ "User-Agent" = "MergeEarn-Release-Script" }
        $result = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoName/actions/runs?branch=main&per_page=1" -Headers $headers -TimeoutSec 30
        if ($result.workflow_runs.Count -gt 0) {
            return $result.workflow_runs[0]
        }
    } catch {
        Write-Warn "Could not query GitHub Actions: $($_.Exception.Message)"
    }
    return $null
}

function Require-Text([string]$Prompt) {
    while ($true) {
        $value = (Read-Host $Prompt).Trim()
        if ($value.Length -gt 0) { return $value }
        Write-Warn "A value is required."
    }
}

Write-Host "MergeEarn production release operator" -ForegroundColor White
Write-Host "Repository: https://github.com/$RepoName"
Write-Host "Secrets are never printed by this script."

Write-Step "Preflight"
foreach ($cmd in @("git", "node", "npm", "npx")) {
    if (-not (Test-Command $cmd)) {
        Stop-Release "$cmd is required but was not found in PATH."
    }
}

$nodeVersion = (& node -v).Trim().TrimStart("v")
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt 22) {
    Stop-Release "Node.js 22+ is required. Current version: $nodeVersion"
}
Write-Ok "Node.js $nodeVersion"

$repoRoot = $PSScriptRoot
Set-Location $repoRoot

$remote = (Invoke-Checked -Command "git" -Arguments @("remote", "get-url", "origin") -Capture).Trim()
if ($remote -notmatch "Saidur-droid/MergeEarn") {
    Stop-Release "This script must run inside the Saidur-droid/MergeEarn clone. Current origin: $remote"
}

$dirty = (Invoke-Checked -Command "git" -Arguments @("status", "--porcelain") -Capture).Trim()
if ($dirty.Length -gt 0) {
    Write-Host $dirty
    Stop-Release "Working tree is not clean. Commit/stash local changes, then rerun."
}

Invoke-Checked -Command "git" -Arguments @("checkout", "main")
Invoke-Checked -Command "git" -Arguments @("pull", "--ff-only", "origin", "main")
Write-Ok "Local main is synced"

if (-not (Test-Path (Join-Path $repoRoot "LICENSE"))) {
    Stop-Release "LICENSE is missing from the repository."
}
Write-Ok "MIT LICENSE present"

Write-Step "Local verification"
Invoke-Checked -Command "npm" -Arguments @("ci")
Invoke-Checked -Command "npm" -Arguments @("run", "scan:secrets")
Invoke-Checked -Command "npm" -Arguments @("run", "typecheck")
Invoke-Checked -Command "npm" -Arguments @("test")
Invoke-Checked -Command "npm" -Arguments @("run", "build")
Write-Ok "Local secret scan, typecheck, tests and build passed"

$ci = Get-LatestGitHubCi
if ($null -ne $ci) {
    Write-Host "Latest GitHub CI: status=$($ci.status) conclusion=$($ci.conclusion) sha=$($ci.head_sha)"
    if ($ci.status -eq "completed" -and $ci.conclusion -ne "success") {
        Stop-Release "Latest GitHub CI is not green."
    }
}

Test-NimiqRpc

Write-Step "Vercel authentication and project link"
try {
    $who = Invoke-Vercel -Arguments @("whoami", "--scope", $VercelScope) -Capture
    Write-Ok "Vercel authenticated: $($who.Trim())"
} catch {
    Write-Warn "Vercel login is required. A browser login may open."
    Invoke-Vercel -Arguments @("login")
}

try {
    Invoke-Vercel -Arguments @("link", "--yes", "--project", $VercelProject, "--scope", $VercelScope)
    Write-Ok "Linked to Vercel project $VercelProject"
} catch {
    Stop-Release "Could not link the existing Vercel project '$VercelProject'. Do not create a duplicate project. Check your Vercel account/team access and rerun."
}

Write-Step "Configuring non-secret production environment"
Set-VercelEnvPlain -Name "APP_URL" -Value $AppUrl -Overwrite
Set-VercelEnvPlain -Name "SUPABASE_URL" -Value $SupabaseUrl -Overwrite
Set-VercelEnvPlain -Name "NIMIQ_RPC_URL" -Value $NimiqRpcUrl -Overwrite
Set-VercelEnvPlain -Name "AI_API_URL" -Value $AiApiUrl -Overwrite
Set-VercelEnvPlain -Name "AI_MODEL" -Value $AiModel -Overwrite

$envText = Get-VercelEnvText

if (-not (Test-VercelEnv -Name "SESSION_ENCRYPTION_KEY" -EnvText $envText)) {
    $generatedSessionKey = New-RandomSecret
    try {
        Set-VercelEnvPlain -Name "SESSION_ENCRYPTION_KEY" -Value $generatedSessionKey
    } finally {
        $generatedSessionKey = $null
    }
} else {
    Write-Ok "SESSION_ENCRYPTION_KEY already exists; preserving it"
}

$envText = Get-VercelEnvText
if (-not (Test-VercelEnv -Name "SUPABASE_SERVICE_ROLE_KEY" -EnvText $envText)) {
    Write-Step "Supabase service-role credential required"
    Write-Host "Opening the existing Supabase project API settings."
    Write-Host "Use the backend service-role/legacy service_role value compatible with the current MergeEarn server code."
    Write-Host "Do NOT paste the key into chat or a file. Enter it only into this hidden prompt."
    Start-Process $SupabaseApiSettingsUrl
    $supabaseSecret = Read-Host "SUPABASE_SERVICE_ROLE_KEY" -AsSecureString
    $ptr = [IntPtr]::Zero
    $plain = $null
    try {
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($supabaseSecret)
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        if (-not (Test-SupabaseServiceKey -Key $plain)) {
            Stop-Release "The supplied Supabase backend credential failed validation."
        }
        Set-VercelEnvPlain -Name "SUPABASE_SERVICE_ROLE_KEY" -Value $plain
        Write-Ok "Supabase backend credential validated and stored in Vercel"
    } finally {
        if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
        $plain = $null
        $supabaseSecret = $null
    }
} else {
    Write-Ok "SUPABASE_SERVICE_ROLE_KEY already exists; preserving it"
}

$envText = Get-VercelEnvText
$hasGitHubId = Test-VercelEnv -Name "GITHUB_CLIENT_ID" -EnvText $envText
$hasGitHubSecret = Test-VercelEnv -Name "GITHUB_CLIENT_SECRET" -EnvText $envText
if (-not $hasGitHubId -or -not $hasGitHubSecret) {
    Write-Step "GitHub OAuth App setup required"
    Write-Host "Create/open the MergeEarn OAuth App with:"
    Write-Host "  Application name: MergeEarn"
    Write-Host "  Homepage URL:     $AppUrl"
    Write-Host "  Callback URL:     $GitHubCallbackUrl"
    Write-Host "PowerShell cannot reliably create a user OAuth App through GitHub REST, so this is a required browser approval step."
    Start-Process $GitHubOAuthSettingsUrl
    Read-Host "Press ENTER after the OAuth App exists and you can see its Client ID/secret" | Out-Null

    if (-not $hasGitHubId) {
        $clientId = Require-Text "GitHub Client ID"
        Set-VercelEnvPlain -Name "GITHUB_CLIENT_ID" -Value $clientId
        $clientId = $null
    }
    if (-not $hasGitHubSecret) {
        Write-Host "Enter the GitHub Client Secret in the hidden prompt. It will not be printed."
        $clientSecret = Read-Host "GitHub Client Secret" -AsSecureString
        Set-VercelEnvSecure -Name "GITHUB_CLIENT_SECRET" -SecureValue $clientSecret
        $clientSecret = $null
    }
} else {
    Write-Ok "GitHub OAuth production variables already exist"
}

$envText = Get-VercelEnvText
$walletVars = @("VITE_NIMIQ_FUNDING_ADDRESS", "NIMIQ_FUNDING_ADDRESS", "NIMIQ_PAYOUT_SOURCE_ADDRESS")
$walletMissing = $false
foreach ($name in $walletVars) {
    if (-not (Test-VercelEnv -Name $name -EnvText $envText)) { $walletMissing = $true }
}
if ($walletMissing) {
    Write-Step "Nimiq public treasury address required"
    Write-Host "Enter ONLY a public NQ address. Never enter a seed phrase, recovery words or private key."
    $treasuryAddress = Require-Text "Public Nimiq treasury NQ address"
    if ($treasuryAddress -notmatch "^NQ") {
        Stop-Release "The value does not look like a public Nimiq NQ address."
    }
    foreach ($name in $walletVars) {
        Set-VercelEnvPlain -Name $name -Value $treasuryAddress -Overwrite
    }
    $treasuryAddress = $null
} else {
    Write-Ok "All three Nimiq public-address variables already exist"
}

Write-Step "Required environment-variable presence check"
$requiredVars = @(
    "APP_URL",
    "SESSION_ENCRYPTION_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "VITE_NIMIQ_FUNDING_ADDRESS",
    "NIMIQ_FUNDING_ADDRESS",
    "NIMIQ_PAYOUT_SOURCE_ADDRESS",
    "NIMIQ_RPC_URL",
    "AI_API_URL",
    "AI_MODEL"
)
$envText = Get-VercelEnvText
$missing = @()
foreach ($name in $requiredVars) {
    if (-not (Test-VercelEnv -Name $name -EnvText $envText)) {
        $missing += $name
    } else {
        Write-Ok $name
    }
}
if ($missing.Count -gt 0) {
    Stop-Release "Missing Vercel Production variables: $($missing -join ', ')"
}

if (-not $SkipDeploy) {
    Write-Step "Deploying production"
    $deployOutput = Invoke-Vercel -Arguments @("deploy", "--prod", "--yes", "--scope", $VercelScope) -Capture
    Write-Host $deployOutput
    Write-Ok "Production deploy command completed"
} else {
    Write-Warn "Deployment skipped by -SkipDeploy"
}

Write-Step "Production smoke tests"
if (-not (Test-ProductionUrl -Url $AppUrl)) {
    Stop-Release "Production URL did not become reachable: $AppUrl"
}
Write-Ok "Production landing page is reachable"

try {
    $session = Invoke-RestMethod -Uri "$AppUrl/api/auth/session" -Method Get -TimeoutSec 30
    if ($null -eq $session.authenticated) { throw "Unexpected session response" }
    Write-Ok "/api/auth/session responded correctly"
} catch {
    Stop-Release "Session API smoke test failed: $($_.Exception.Message)"
}

if (Test-OAuthRedirect -Url "$AppUrl/api/auth/github") {
    Write-Ok "GitHub OAuth start endpoint redirects to GitHub"
} else {
    Stop-Release "GitHub OAuth start endpoint did not produce the expected GitHub authorization redirect."
}

Test-NimiqRpc

if (-not $SkipHumanE2E) {
    Write-Step "Human-approved real E2E"
    Write-Host "PowerShell can automate deployment and verification, but it cannot sign Nimiq wallet transactions for you."
    Write-Host "The next steps intentionally pause for browser login/button actions and wallet signatures."
    Start-Process $AppUrl

    Read-Host "1/6 Complete GitHub sign-in on the production app and confirm the dashboard loads. Press ENTER when done" | Out-Null
    Read-Host "2/6 Select a real public repo/issue, create/publish the smallest practical NIM bounty, approve the Nimiq funding signature, and wait until MergeEarn shows FUNDED. Press ENTER when done" | Out-Null
    Read-Host "3/6 Claim the funded bounty with a contributor payout NQ address. Press ENTER when MergeEarn shows CLAIMED" | Out-Null
    Read-Host "4/6 Create/link a real PR targeting the expected default branch, merge it on GitHub, then use MergeEarn verification until it shows VERIFIED. Press ENTER when done" | Out-Null
    Read-Host "5/6 As an authorized maintainer approve the bounty, then approve/sign the Nimiq payout. Wait until the app shows PAID. Press ENTER when done" | Out-Null
    Read-Host "6/6 Confirm the final PAID state is visible in production. Press ENTER to run the final runtime smoke check" | Out-Null

    try {
        $sessionAfter = Invoke-RestMethod -Uri "$AppUrl/api/auth/session" -Method Get -TimeoutSec 30
        Write-Ok "Production API still responds after E2E"
    } catch {
        Stop-Release "Production API failed after E2E: $($_.Exception.Message)"
    }
} else {
    Write-Warn "Real wallet/browser E2E was skipped by -SkipHumanE2E"
}

Write-Step "Final status"
$ci = Get-LatestGitHubCi
if ($null -ne $ci) {
    Write-Host "GitHub CI: status=$($ci.status) conclusion=$($ci.conclusion) sha=$($ci.head_sha)"
}
Write-Host "Repository: https://github.com/$RepoName"
Write-Host "Production: $AppUrl"
Write-Host ""
if ($SkipHumanE2E) {
    Write-Warn "Automation finished, but the real wallet-backed E2E was skipped. Do not call the release 100% complete yet."
} else {
    Write-Ok "Setup/deploy checks passed and the operator confirmed the real E2E checkpoints."
    Write-Host "Next: inspect Vercel runtime logs and submit the competition entry using docs/SUBMISSION_FORM.md."
}
