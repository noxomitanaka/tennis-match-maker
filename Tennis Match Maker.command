#!/bin/bash

# ============================================
#  Tennis Match Maker — ダブルクリックで起動
# ============================================

# このファイルがある場所に移動
cd "$(dirname "$0")"

# distフォルダを確認
if [ ! -d "dist" ]; then
  echo ""
  echo "エラー: dist フォルダが見つかりません。"
  echo "先に npm run build を実行してください。"
  echo ""
  read -p "Enterキーで閉じます..."
  exit 1
fi

# 使用するポート（8080が使用中なら自動で探す）
PORT=8080
while lsof -i :$PORT > /dev/null 2>&1; do
  PORT=$((PORT + 1))
  if [ $PORT -gt 8099 ]; then
    echo "エラー: 空きポートが見つかりません（8080-8099）"
    read -p "Enterキーで閉じます..."
    exit 1
  fi
done

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     Tennis Match Maker 起動中...     ║"
echo "╠══════════════════════════════════════╣"
echo "║                                      ║"
echo "║  ブラウザが自動で開きます。          ║"
echo "║  開かない場合は下記URLをブラウザに    ║"
echo "║  貼り付けてください:                  ║"
echo "║                                      ║"
echo "║  http://localhost:$PORT               ║"
echo "║                                      ║"
echo "║  終了するには、このウィンドウを       ║"
echo "║  閉じてください。                     ║"
echo "║                                      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 少し待ってからブラウザを開く（サーバー起動を待つ）
(sleep 1 && open "http://localhost:$PORT") &

# Python の簡易HTTPサーバーで dist/ を配信
cd dist
python3 -m http.server $PORT 2>/dev/null

