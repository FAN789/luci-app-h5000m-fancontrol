#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CONTROLLER="${ROOT}/root/usr/sbin/h5000m-fancontrol"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT INT TERM

now="$(date +%s)"
printf 'temperature=43.6\ntemperature_sensor=modem2\nupdated=%s\n' "${now}" > "${TMP}/temperature"
output="$(H5000M_FAN_MT5700M_TEMP_CACHE="${TMP}/temperature" sh "${CONTROLLER}" status 2>/dev/null)"
printf '%s\n' "${output}" | grep -qx 'module_temp=44'

stale=$((now - 61))
printf 'temperature=43.6\ntemperature_sensor=modem2\nupdated=%s\n' "${stale}" > "${TMP}/temperature"
output="$(H5000M_FAN_MT5700M_TEMP_CACHE="${TMP}/temperature" sh "${CONTROLLER}" status 2>/dev/null)"
printf '%s\n' "${output}" | grep -qx 'module_temp='

tele="${TMP}/tele.json"
missing="${TMP}/missing"
run_tele() {
	H5000M_FAN_MT5700M_TEMP_CACHE="${missing}" H5000M_FAN_5GMODEM_TELE="${tele}" sh "${CONTROLLER}" status 2>/dev/null
}

printf '{"sig":67,"temp":48,"mode":"5G"}\n' > "${tele}"
run_tele | grep -qx 'module_temp=48'

printf '{"sig":67,"mode":"4G","temp":-5}\n' > "${tele}"
run_tele | grep -qx 'module_temp=-5'

printf '{"sig":67,"mode":"4G"}\n' > "${tele}"
run_tele | grep -qx 'module_temp='

printf '{"temp":999}\n' > "${tele}"
run_tele | grep -qx 'module_temp='

printf '{"temp":48}\n' > "${tele}"
touch -d "@$(( $(date +%s) - 91 ))" "${tele}"
run_tele | grep -qx 'module_temp='

printf '{"temp":48}\n' > "${tele}"
printf 'temperature=43.6\nupdated=%s\n' "$(date +%s)" > "${TMP}/temperature"
H5000M_FAN_MT5700M_TEMP_CACHE="${TMP}/temperature" H5000M_FAN_5GMODEM_TELE="${tele}" sh "${CONTROLLER}" status 2>/dev/null \
	| grep -qx 'module_temp=44'

for level in 0 1 2 3; do
	printf '{"temp":48,"therm":%s}\n' "${level}" > "${tele}"
	out="$(run_tele)"
	printf '%s\n' "${out}" | grep -qx "module_therm=${level}"
	case "${level}" in 0) want=0 ;; 1) want=128 ;; 2) want=192 ;; 3) want=255 ;; esac
	printf '%s\n' "${out}" | grep -qx "modem_floor=${want}"
done
printf '{"temp":48,"therm":3}\n' > "${tele}"
touch -d "@$(( $(date +%s) - 91 ))" "${tele}"
run_tele | grep -qx 'modem_floor=0'

printf '{\n  "temp": 48,\n  "therm": 3\n}\n' > "${tele}"
run_tele | grep -qx 'module_temp=48'
run_tele | grep -qx 'modem_floor=255'

for payload in \
 '{"nested":{"temp":48,"therm":3}}' \
 '{"temp":48,"therm":3' \
 '{"temp":48,"therm":3} garbage' \
 '{"temp":48,"therm":3} {}' \
 '[{"temp":48,"therm":3}]' \
 '{"temp":"48","therm":"3"}' \
 '{"temp":null,"therm":null}' \
 '{"temp":true,"therm":true}' \
 '{"temp":48.5,"therm":1.5}' \
 '{"temp":151,"therm":4}' \
 '{"temp":-41,"therm":-1}' \
 '{"temp":[],"therm":{}}'; do
 printf '%s\n' "$payload" > "${tele}"
 out="$(run_tele)"
 printf '%s\n' "$out" | grep -qx 'module_temp='
 printf '%s\n' "$out" | grep -qx 'module_therm='
 printf '%s\n' "$out" | grep -qx 'modem_floor=0'
done
for payload in '{"temp":-40,"therm":0}' '{"temp":150,"therm":3}'; do
 printf '%s\n' "$payload" > "${tele}"
 run_tele | grep -Eq '^module_temp=(-40|150)$'
done
printf '{"temp":48,"therm":3}\n' > "${tele}"
touch -d "@$(( $(date +%s) + 120 ))" "${tele}"
run_tele | grep -qx 'module_temp='
run_tele | grep -qx 'modem_floor=0'

echo 'module temperature tests passed'
