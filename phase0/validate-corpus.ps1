$ErrorActionPreference = 'Stop'

$phase0Root = $PSScriptRoot
$corpusRoot = Join-Path $phase0Root 'corpus'

$posts = @(Import-Csv (Join-Path $corpusRoot 'pilot-posts.csv'))
$candidates = @(Import-Csv (Join-Path $corpusRoot 'gold-event-candidates.csv'))
$canonicalGroups = @(Import-Csv (Join-Path $corpusRoot 'canonical-event-groups.csv'))
$samplingPool = @(Import-Csv (Join-Path $corpusRoot 'top-grid-sampling-pool.csv'))

function Assert-True {
    param(
        [Parameter(Mandatory)] [bool] $Condition,
        [Parameter(Mandatory)] [string] $Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

Assert-True ($posts.Count -ge 50) "RFC corpus gate failed: expected at least 50 posts, found $($posts.Count)."
Assert-True ((@($posts.source_account | Sort-Object -Unique)).Count -ge 3) 'RFC corpus gate failed: fewer than three source accounts are represented.'
Assert-True ((@($posts.post_id | Group-Object | Where-Object Count -gt 1)).Count -eq 0) 'Duplicate post_id values found.'
Assert-True ((@($posts.permalink | Group-Object | Where-Object Count -gt 1)).Count -eq 0) 'Duplicate post permalinks found.'
Assert-True ((@($candidates.candidate_id | Group-Object | Where-Object Count -gt 1)).Count -eq 0) 'Duplicate candidate_id values found.'

$knownPostIds = @{}
foreach ($post in $posts) {
    $knownPostIds[$post.post_id] = $true
}

foreach ($candidate in $candidates) {
    Assert-True ($knownPostIds.ContainsKey($candidate.post_id)) "Candidate $($candidate.candidate_id) references unknown post $($candidate.post_id)."
}

$candidatesByPost = @{}
foreach ($candidate in $candidates) {
    if (-not $candidatesByPost.ContainsKey($candidate.post_id)) {
        $candidatesByPost[$candidate.post_id] = 0
    }
    $candidatesByPost[$candidate.post_id] += 1
}

foreach ($post in $posts) {
    $actualCount = if ($candidatesByPost.ContainsKey($post.post_id)) { $candidatesByPost[$post.post_id] } else { 0 }
    Assert-True ($actualCount -eq [int]$post.gold_event_count) "Post $($post.post_id) expects $($post.gold_event_count) candidates but has $actualCount."
}

$knownCandidateIds = @{}
foreach ($candidate in $candidates) {
    $knownCandidateIds[$candidate.candidate_id] = $true
}

foreach ($group in $canonicalGroups) {
    if ($group.candidate_id) {
        Assert-True ($knownCandidateIds.ContainsKey($group.candidate_id)) "Canonical group $($group.canonical_event_group) references unknown candidate $($group.candidate_id)."
    }
    if ($group.post_id) {
        Assert-True ($knownPostIds.ContainsKey($group.post_id)) "Canonical group $($group.canonical_event_group) references unknown post $($group.post_id)."
    }
}

$pendingImagePosts = @($samplingPool | Where-Object {
    $_.permalink_type -eq 'POST' -and $_.selection_status -ne 'admitted_to_corpus'
})
Assert-True ($pendingImagePosts.Count -eq 0) "Sampling pool still contains $($pendingImagePosts.Count) unprocessed image/carousel posts."

Write-Host "Corpus validation passed: $($posts.Count) posts, $((@($posts.source_account | Sort-Object -Unique)).Count) accounts, $($candidates.Count) candidates."
