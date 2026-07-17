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

echo 'module temperature tests passed'
