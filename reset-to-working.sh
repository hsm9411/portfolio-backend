#!/bin/bash

# 마지막 성공 커밋으로 되돌리기
echo "🔄 Resetting to last successful commit (08be240)..."
git reset --hard 08be240

echo "✅ Reset complete!"
echo ""
echo "📝 Next steps:"
echo "1. Review START_HERE.md for current status"
echo "2. Run: git push origin develop --force"
echo "3. Clean up unnecessary files (optional)"
