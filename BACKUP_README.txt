
# 📦 System Backup - created $(date +%Y-%m-%d_%H-%M-%S)
This backup includes the full source code excluding:
- node_modules
- .git
- dist (build artifacts)

To restore:
1. Unzip this file
2. Run `npm install` in root
3. Run `npm install` in client/
4. Run `npm run build` in client/
