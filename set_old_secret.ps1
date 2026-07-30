$token = "sbp_a9fc1c0504263bbcd47732baa7c5cd2101eb3ba0"
$projectRef = "hyrmyaggzozcwxjvziwk"
$body = ConvertTo-Json @(@{name="GROQ_API_KEY"; value="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"})

$response = Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/$projectRef/secrets" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $body

Write-Output "Success setting secret on hyrmyaggzozcwxjvziwk: $($response | ConvertTo-Json)"
