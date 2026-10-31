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

echo 'module temperature tests passed'
