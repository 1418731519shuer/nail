#!/bin/bash

WEBHOOK="https://open.larkoffice.com/open-apis/bot/v2/hook/3c8ae095-6c2e-44ff-82ba-33b11db26b03"
BEACON_LOG="/tmp/visitor-beacon.log"
DEDUP_FILE="/tmp/visitor-notify-dedup"

get_ip_info() {
  local ip="$1"
  curl -s --max-time 3 "http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,countryCode,regionName,city,isp" 2>/dev/null
}

is_duplicate() {
  local key="$1"
  local now
  now=$(date +%s)
  local last
  last=$(grep "^${key}=" "$DEDUP_FILE" 2>/dev/null | cut -d= -f2)
  if [[ -n "$last" && $((now - last)) -lt 300 ]]; then
    return 0
  fi
  grep -v "^${key}=" "$DEDUP_FILE" 2>/dev/null > /tmp/visitor-dedup-tmp
  echo "${key}=${now}" >> /tmp/visitor-dedup-tmp
  mv /tmp/visitor-dedup-tmp "$DEDUP_FILE"
  return 1
}

send_notify() {
  local ip="$1"
  local page="$2"
  local ua="$3"
  local time="$4"

  local ip_info
  ip_info=$(get_ip_info "$ip")

  local country isp region city
  country=$(echo "$ip_info" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('countryCode',''))" 2>/dev/null)
  isp=$(echo "$ip_info" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('isp',''))" 2>/dev/null)
  region=$(echo "$ip_info" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('regionName',''))" 2>/dev/null)
  city=$(echo "$ip_info" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('city',''))" 2>/dev/null)
  local location="${region} ${city} · ${isp}"

  local device="💻 电脑"
  [[ "$ua" =~ "Mobile" || "$ua" =~ "Android" || "$ua" =~ "iPhone" ]] && device="📱 手机"

  local page_name
  case "$page" in
    /) page_name="🏠 主页" ;;
    /yunying*) page_name="🛠️ 运营端" ;;
    /user*) page_name="💅 用户端" ;;
    *) page_name="$page" ;;
  esac

  curl -s -X POST "$WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"msg_type\":\"text\",\"content\":{\"text\":\"✅ 真人访问了美甲系统！\n\n页面：${page_name}\nIP：${ip}\n地区：${location}\n设备：${device}\n时间：${time}\"}}" \
    > /dev/null 2>&1
}

echo "开始监听真人访客 beacon..."
touch "$DEDUP_FILE"

# 监听 beacon 专用日志（只有真人浏览器执行 JS 后才写入）
tail -n 0 -F "$BEACON_LOG" | while read -r line; do
  # 格式：IP|PAGE|UA|TIME
  ip=$(echo "$line" | cut -d'|' -f1)
  page=$(echo "$line" | cut -d'|' -f2)
  ua=$(echo "$line" | cut -d'|' -f3)
  time_str=$(echo "$line" | cut -d'|' -f4)

  # 去掉 IPv4-mapped IPv6 前缀 ::ffff:
  ip="${ip#::ffff:}"
  [[ -z "$ip" || "$ip" == "127.0.0.1" || "$ip" == "::1" ]] && continue

  dedup_key="${ip}:${page}"
  is_duplicate "$dedup_key" && continue

  send_notify "$ip" "$page" "$ua" "$time_str" &
done
