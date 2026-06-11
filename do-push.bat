cd /d C:\Users\zhang\indier-site
gh auth token > C:\Users\zhang\indier-site\token.tmp
set /p TOKEN=<C:\Users\zhang\indier-site\token.tmp
git push https://%TOKEN%@github.com/zhang088033-hash/INDIER.git main -f
del C:\Users\zhang\indier-site\token.tmp
