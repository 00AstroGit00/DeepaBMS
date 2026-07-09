#!/bin/bash
# Production Deployment Rollback and Safety Recovery Script

echo "Checking current Git deployment status..."
git status

echo "--------------------------------------------------------"
echo "Deepa BMS Rollback Strategy and Branch Reversion Manual"
echo "--------------------------------------------------------"
echo "In the event of critical issues on the production build:"
echo ""
echo "1. Revert to the last stable release tag:"
echo "   git checkout v1.0.0"
echo ""
echo "2. Revert the last merge/commit on main branch:"
echo "   git revert -m 1 HEAD"
echo ""
echo "3. Reset local database backup sync state:"
echo "   If the database schema has changed, recover from the last daily gzipped backup:"
echo "   gunzip -c /data/data/com.termux/files/home/project/DeepaBMS/apps/backend/backups/deepa-bms_LAST_STABLE_DATE.db.gz > /data/data/com.termux/files/home/project/DeepaBMS/apps/backend/deepa-bms.db"
echo ""
echo "4. Redeploy the stable build version:"
echo "   - Web hosting: deploy static dist from stable tags"
echo "   - Android APK: re-submit last compiled signed APK"
echo "--------------------------------------------------------"
