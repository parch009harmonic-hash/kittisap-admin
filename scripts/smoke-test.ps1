param(
  [string]$BaseUrl = "https://kittisap.vercel.app",
  [switch]$VerboseOutput
)

$ErrorActionPreference = "Stop"

function Normalize-BaseUrl([string]$Url) {
  if ([string]::IsNullOrWhiteSpace($Url)) {
    $trimmed = ""
  } else {
    $trimmed = $Url.Trim()
  }
  if ([string]::IsNullOrWhiteSpace($trimmed)) {
    throw "BaseUrl is required."
  }
  return $trimmed.TrimEnd("/")
}

function Try-ParseJson([string]$Content) {
  if ([string]::IsNullOrWhiteSpace($Content)) {
    return $null
  }
  try {
    return $Content | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Add-Result {
  param(
    [System.Collections.Generic.List[string]]$Failures,
    [ref]$PassCount,
    [string]$Name,
    [bool]$Ok,
    [string]$Detail
  )

  if ($Ok) {
    $PassCount.Value += 1
    Write-Host "[PASS] $Name :: $Detail" -ForegroundColor Green
    return
  }

  $Failures.Add("$Name :: $Detail")
  Write-Host "[FAIL] $Name :: $Detail" -ForegroundColor Red
}

function Invoke-SmokeCheck {
  param(
    [System.Collections.Generic.List[string]]$Failures,
    [ref]$PassCount,
    [string]$BaseUrl,
    [string]$Name,
    [string]$Path,
    [string]$Method = "GET",
    [int[]]$ExpectedStatus = @(200),
    [hashtable]$Headers = $null,
    [object]$Body = $null,
    [scriptblock]$Validate = $null,
    [bool]$Verbose = $false
  )

  $uri = "$BaseUrl$Path"
  $status = -1
  $content = ""

  try {
    $requestParams = @{
      Uri = $uri
      Method = $Method
      UseBasicParsing = $true
      TimeoutSec = 35
    }
    if ($Headers) {
      $requestParams.Headers = $Headers
    }
    if ($null -ne $Body) {
      $requestParams.ContentType = "application/json"
      $requestParams.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
    }

    $response = Invoke-WebRequest @requestParams
    $status = [int]$response.StatusCode
    $content = [string]$response.Content
  } catch [System.Net.WebException] {
    $webResponse = $_.Exception.Response
    if ($null -eq $webResponse) {
      Add-Result -Failures $Failures -PassCount $PassCount -Name $Name -Ok $false -Detail $_.Exception.Message
      return
    }

    $status = [int]$webResponse.StatusCode
    $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
    $content = $reader.ReadToEnd()
    $reader.Close()
  } catch {
    Add-Result -Failures $Failures -PassCount $PassCount -Name $Name -Ok $false -Detail $_.Exception.Message
    return
  }

  $statusOk = $ExpectedStatus -contains $status
  $validateOk = $true
  $validateDetail = ""

  if ($Validate) {
    try {
      $validateResult = & $Validate $status $content
      if ($validateResult -is [hashtable]) {
        $validateOk = [bool]($validateResult.ok)
        $validateDetail = [string]($validateResult.detail)
      } elseif ($validateResult -is [bool]) {
        $validateOk = $validateResult
      } else {
        $validateOk = [bool]$validateResult
      }
    } catch {
      $validateOk = $false
      $validateDetail = $_.Exception.Message
    }
  }

  $ok = $statusOk -and $validateOk
  $detail = "status=$status"
  if (-not [string]::IsNullOrWhiteSpace($validateDetail)) {
    $detail = "$detail; $validateDetail"
  }
  Add-Result -Failures $Failures -PassCount $PassCount -Name $Name -Ok $ok -Detail $detail

  if ($Verbose) {
    Write-Host "  URL: $uri" -ForegroundColor DarkGray
    if (-not [string]::IsNullOrWhiteSpace($content)) {
      $previewLength = [Math]::Min(220, $content.Length)
      Write-Host ("  Body: " + $content.Substring(0, $previewLength)) -ForegroundColor DarkGray
    }
  }
}

$normalizedBaseUrl = Normalize-BaseUrl -Url $BaseUrl
$failures = New-Object System.Collections.Generic.List[string]
$passCount = 0

Write-Host "Running smoke checks against: $normalizedBaseUrl" -ForegroundColor Cyan

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "Login page reachable" -Path "/auth/login" -ExpectedStatus @(200) -Validate {
  param($status, $content)
  $hasCopy = $content -match "Customer Login|Sign in|CUSTOMER LOGIN"
  return @{ ok = $hasCopy; detail = "login copy visible=$hasCopy" }
} -Verbose:$VerboseOutput

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "Account page reachable" -Path "/account" -ExpectedStatus @(200) -Validate {
  param($status, $content)
  $hasTitle = $content -match "Customer Account|Kittisap Account|KITTISAP ACCOUNT"
  return @{ ok = $hasTitle; detail = "account title visible=$hasTitle" }
} -Verbose:$VerboseOutput

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "Forgot OTP API rejects missing email" -Path "/api/customer/auth/forgot-password/request" -Method "POST" -ExpectedStatus @(400) -Body @{} -Validate {
  param($status, $content)
  $json = Try-ParseJson -Content $content
  $code = [string]($json.code)
  $ok = $code -eq "EMAIL_REQUIRED"
  return @{ ok = $ok; detail = "code=$code" }
} -Verbose:$VerboseOutput

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "Forgot OTP API rejects non-registered email" -Path "/api/customer/auth/forgot-password/request" -Method "POST" -ExpectedStatus @(404) -Body @{ email = ("smoke-" + [guid]::NewGuid().ToString("N") + "@example.com") } -Validate {
  param($status, $content)
  $json = Try-ParseJson -Content $content
  $code = [string]($json.code)
  $ok = $code -eq "EMAIL_NOT_FOUND"
  return @{ ok = $ok; detail = "code=$code" }
} -Verbose:$VerboseOutput

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "KYC session API requires auth" -Path "/api/customer/kyc/session" -ExpectedStatus @(401) -Validate {
  param($status, $content)
  $json = Try-ParseJson -Content $content
  $code = [string]($json.code)
  $ok = $code -eq "AUTH_REQUIRED"
  return @{ ok = $ok; detail = "code=$code" }
} -Verbose:$VerboseOutput

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "Delete account API requires auth" -Path "/api/customer/account-delete/request" -Method "POST" -ExpectedStatus @(401) -Body @{ password = "x"; reason = "smoke" } -Validate {
  param($status, $content)
  $json = Try-ParseJson -Content $content
  $code = [string]($json.code)
  $ok = $code -eq "AUTH_REQUIRED"
  return @{ ok = $ok; detail = "code=$code" }
} -Verbose:$VerboseOutput

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "Recover account API requires auth" -Path "/api/customer/account-delete/recover" -Method "POST" -ExpectedStatus @(401) -Body @{ password = "x"; faceScanPassed = $true; faceScanMethod = "camera" } -Validate {
  param($status, $content)
  $json = Try-ParseJson -Content $content
  $code = [string]($json.code)
  $ok = $code -eq "AUTH_REQUIRED"
  return @{ ok = $ok; detail = "code=$code" }
} -Verbose:$VerboseOutput

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "Recover via email OTP API requires auth" -Path "/api/customer/account-delete/recover-email-otp" -Method "POST" -ExpectedStatus @(401) -Body @{} -Validate {
  param($status, $content)
  $json = Try-ParseJson -Content $content
  $code = [string]($json.code)
  $ok = $code -eq "AUTH_REQUIRED"
  return @{ ok = $ok; detail = "code=$code" }
} -Verbose:$VerboseOutput

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "Recover via verify API rejects unknown email" -Path "/api/customer/account-delete/recover-verify" -Method "POST" -ExpectedStatus @(404) -Body @{ email = "smoke@example.com"; password = "x"; faceScanPassed = $true; faceScanMethod = "camera" } -Validate {
  param($status, $content)
  $json = Try-ParseJson -Content $content
  $code = [string]($json.code)
  $ok = $code -eq "PROFILE_NOT_FOUND"
  return @{ ok = $ok; detail = "code=$code" }
} -Verbose:$VerboseOutput

Invoke-SmokeCheck -Failures $failures -PassCount ([ref]$passCount) -BaseUrl $normalizedBaseUrl -Name "Recover via order-proof API validates email input" -Path "/api/customer/account-delete/recover-order-proof" -Method "POST" -ExpectedStatus @(400) -Body @{} -Validate {
  param($status, $content)
  $json = Try-ParseJson -Content $content
  $code = [string]($json.code)
  $ok = $code -eq "EMAIL_REQUIRED"
  return @{ ok = $ok; detail = "code=$code" }
} -Verbose:$VerboseOutput

Write-Host ""
Write-Host "Smoke summary: passed=$passCount failed=$($failures.Count)" -ForegroundColor Cyan

if ($failures.Count -gt 0) {
  Write-Host "Failed checks:" -ForegroundColor Red
  foreach ($item in $failures) {
    Write-Host " - $item" -ForegroundColor Red
  }
  exit 1
}

Write-Host "All smoke checks passed." -ForegroundColor Green
exit 0
