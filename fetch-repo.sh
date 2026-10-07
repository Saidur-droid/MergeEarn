```bash
#!/bin/bash
curl -s https://api.github.com/repos/Saidur-droid/MergeEarn/git/trees/main?recursive=1 | jq -r '.tree[] | .path'
