#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM
sed '/^case /,$d' "$ROOT/root/usr/sbin/h5000m-fancontrol" | sed "s|/sys/|$TMP/sys/|g" > "$TMP/functions"
export H5000M_FAN_SENSOR_SYSFS_ROOT="$TMP/sys"
export H5000M_FAN_RADIO_SYSFS_ROOT="$TMP/net"
export H5000M_FAN_5GMODEM_TELE="$TMP/tele.json"
export H5000M_FAN_MT5700M_TEMP_CACHE="$TMP/missing"
. "$TMP/functions"
STATE_FILE="$TMP/state"
POLICY_FILE="$TMP/policy"
mkdir -p "$TMP/sys/class/hwmon/hwmon0" "$TMP/sys/class/thermal/thermal_zone0" "$TMP/sys/class/thermal/cooling_device0"
pwm="$TMP/sys/class/hwmon/hwmon0/pwm1"
zone="$TMP/sys/class/thermal/thermal_zone0"
echo pwmfan > "$TMP/sys/class/hwmon/hwmon0/name"
echo cpu > "$zone/type"
echo 30000 > "$zone/temp"
echo step_wise > "$zone/policy"
echo 'step_wise user_space' > "$zone/available_policies"
echo pwm-fan > "$TMP/sys/class/thermal/cooling_device0/type"
echo 3 > "$TMP/sys/class/thermal/cooling_device0/max_state"
mkdir -p "$TMP/sys/firmware/devicetree/base/pwm-fan"
printf '\000\000\000\000\000\000\000\300\000\000\000\340\000\000\000\377' > "$TMP/sys/firmware/devicetree/base/pwm-fan/cooling-levels"
uci() {
 case "${3##*.}" in
 enabled) echo "${TEST_ENABLED:-1}" ;;
 mode) echo "${TEST_MODE:-manual}" ;;
 manual_pwm) echo 32 ;;
 start_boost_ms|down_delay|hysteresis) echo 0 ;;
 curve) echo custom ;;
 curve_custom) echo '20:0,150:0' ;;
 *) return 1 ;;
 esac
}
logger() { :; }
check() {
 expected="$1"
 rm -f "$STATE_FILE"
 echo 17 > "$pwm"
 apply_once
 test "$(cat "$pwm")" = "$expected"
 test "$(cat "$zone/policy")" = step_wise
 grep -qx "applied_pwm=$expected" "$STATE_FILE"
}
for TEST_MODE in manual auto; do
 export TEST_MODE
 for pair in '0 32' '1 128' '2 192' '3 255'; do
  set -- $pair
  printf '{"therm": %s}\n' "$1" > "$FIVEGMODEM_TELE"
  if [ "$TEST_MODE" = auto ] && [ "$1" = 0 ]; then check 0; else check "$2"; fi
 done
 for payload in '{"nested":{"therm":3}}' '{"therm":3' '{"therm":"3"}' '{"therm":3} garbage'; do
  printf '%s\n' "$payload" > "$FIVEGMODEM_TELE"
  if [ "$TEST_MODE" = auto ]; then check 0; else check 32; fi
 done
 done
TEST_MODE=manual
printf '{"therm":1}\n' > "$FIVEGMODEM_TELE"
echo 40000 > "$zone/temp"
check 192
grep -qx 'thermal_floor=192' "$STATE_FILE"
grep -qx 'reason=manual+kernel-floor' "$STATE_FILE"
printf '{"therm":3}\n' > "$FIVEGMODEM_TELE"
TEST_MODE=kernel
check 17
grep -qx 'reason=kernel' "$STATE_FILE"
TEST_MODE=manual; TEST_ENABLED=0
check 17
grep -qx 'reason=kernel' "$STATE_FILE"
echo 'PASS: applied modem PWM, kernel-only/disabled policy and retained kernel floor'
