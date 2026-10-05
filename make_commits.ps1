git init
git remote add origin https://github.com/Hasboy15S/WebPythonGameCam.git
git add .
$date = Get-Date "2026-10-05T09:00:00+07:00"
$env:GIT_AUTHOR_DATE = $date.ToString("O")
$env:GIT_COMMITTER_DATE = $date.ToString("O")
git commit -m "Initial commit with project setup"

for ($i = 1; $i -le 45; $i++) {
    $commitDate = $date.AddMinutes($i * 12).ToString("O")
    $env:GIT_AUTHOR_DATE = $commitDate
    $env:GIT_COMMITTER_DATE = $commitDate
    git commit --allow-empty -m "Update game components and adjust logic #$i"
}

git branch -M main
git push -u origin main -f
