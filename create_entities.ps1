$entities = @(
    'AIKnowledge','Tournament','AIChat','TournamentLeaderboard','Registration',
    'Diamond','Notification','Report','BanRecord','PastTournament','Banner',
    'VideoBanner','DashboardNotice','AppNotice','RedeemRequest','PaymentRequest',
    'Referral','TeamProfile','TournamentChat','PaymentQR','DiscountCode',
    'AppSettings','AboutUsContent','WinnerNotice','ActiveUser','ChatSettings',
    'Match','Rating','SupportTicket','SupportContact','RedeemCode','AdminTask',
    'TaskSubmission','User','GlobalChat','PlayerMessage','LegalContent','FAQ',
    'LeaderboardEntry','MessageTemplate','PhotoLibrary','TeamInvite',
    'Announcement','TournamentMatch'
)

$dir = "src\entities"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

foreach ($e in $entities) {
    $content = "export { $e } from '@/api/entities';"
    $path = "$dir\$e.js"
    Set-Content -Path $path -Value $content -Encoding UTF8
    Write-Host "Created $path"
}
Write-Host "ALL DONE - $($entities.Count) files created"
