# Initialize project
Write-Output "Creating Railway project..."
$project = & railway init --name mr-cisco-whatsapp --json | ConvertFrom-Json
$projectId = $project.id
Write-Output "Created project: $projectId"

# Add service linked to GitHub repo
Write-Output "Linking GitHub repository to Railway service..."
$service = & railway add --repo Francisco-Ramon/mr-cisco-whatsapp --branch master --service mr-cisco-whatsapp --json | ConvertFrom-Json
$serviceId = $service.id
Write-Output "Created service: $serviceId"

# Add persistent volume
Write-Output "Adding persistent volume at /data..."
& railway volume add --mount-path /data --json

# Set environment variables
Write-Output "Setting environment variables..."
& railway variable set `
  SUPABASE_URL=https://xzufkruggqajucuhxtik.supabase.co `
  SUPABASE_SERVICE_ROLE_KEY=sb_secret_mH8IlMvEw9i9R1hcNF0hpQ_nesmJ9LN `
  GROQ_API_KEY=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 `
  PORT=3001 `
  --json

Write-Output "Done! Deploying service now..."
& railway deploy --json
