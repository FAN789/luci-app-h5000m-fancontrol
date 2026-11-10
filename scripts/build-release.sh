#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work_dir="${RUNNER_TEMP:-/tmp}/h5000m-fan-sdk"
output_dir="${repo_dir}/dist-release"
sdk_version=25.12.6
base_url="https://downloads.openwrt.org/releases/${sdk_version}/targets/mediatek/filogic"

mkdir -p "${work_dir}" "${output_dir}"
find "${output_dir}" -mindepth 1 -maxdepth 1 -delete
cd "${work_dir}"
curl -fsSLO "${base_url}/sha256sums"
archive="$(awk '/openwrt-sdk-.*Linux-x86_64\.tar\.zst$/ { print $2; exit }' sha256sums | sed 's/^\*//')"
test -n "${archive}"
curl -fL --retry 5 "${base_url}/${archive}" -o "${archive}"
grep "[ *]${archive}$" sha256sums | sha256sum -c -
tar --zstd -xf "${archive}"
sdk_dir="$(find "${work_dir}" -maxdepth 1 -type d -name 'openwrt-sdk-*' | head -n 1)"
test -n "${sdk_dir}"

cd "${sdk_dir}"
./scripts/feeds update -a
./scripts/feeds install luci-base

perl -0pi -e 's/(config ALL\n\s+bool "Select all userspace packages by default"\n\s+default )y/${1}n/' Config.in
perl -0pi -e 's/(config TARGET_MULTI_PROFILE\n\s+bool\n\s+default )y/${1}n/; s/(config TARGET_ALL_PROFILES\n\s+bool\n\s+default )y/${1}n/; s/(config TARGET_DEVICE_mediatek_filogic_DEVICE_[^\n]+\n\s+bool\n\s+default )y/${1}n/g' Config-build.in
sed -i 's/^[[:space:]]*default m$/\tdefault n/' Config-build.in

mkdir -p package/h5000m-custom
rsync -a --exclude '.git/' --exclude '.github/' --exclude 'scripts/' --exclude 'dist/' --exclude 'dist-release/' "${repo_dir}/" package/h5000m-custom/luci-app-h5000m-fancontrol/
cat > .config <<'EOF'
CONFIG_TARGET_mediatek=y
CONFIG_TARGET_mediatek_filogic=y
# CONFIG_ALL is not set
# CONFIG_ALL_KMODS is not set
# CONFIG_ALL_NONSHARED is not set
CONFIG_PACKAGE_luci-app-h5000m-fancontrol=m
CONFIG_LUCI_LANG_zh_Hans=y
CONFIG_LUCI_LANG_ru=y
EOF
make defconfig
make package/h5000m-custom/luci-app-h5000m-fancontrol/compile -j"$(nproc)" V=s

find bin -type f \( -name 'luci-app-h5000m-fancontrol-*.apk' -o -name 'luci-app-h5000m-fancontrol_*.ipk' -o -name 'luci-i18n-h5000m-fancontrol-zh-cn-*.apk' -o -name 'luci-i18n-h5000m-fancontrol-zh-cn_*.ipk' -o -name 'luci-i18n-h5000m-fancontrol-ru-*.apk' -o -name 'luci-i18n-h5000m-fancontrol-ru_*.ipk' \) -exec cp -f {} "${output_dir}/" \;
version="$(sed -n 's/^PKG_VERSION:=//p' "${repo_dir}/Makefile")"
revision="$(sed -n 's/^PKG_RELEASE:=//p' "${repo_dir}/Makefile")"
test -s "${output_dir}/luci-app-h5000m-fancontrol-${version}-r${revision}.apk"
for language in zh-cn ru; do
  set -- "${output_dir}"/luci-i18n-h5000m-fancontrol-"${language}"-*.apk
  test "$#" -eq 1
  test -s "$1"
done
if find "${output_dir}" -name '*.apk' | grep -q .; then
  cp public-key.pem "${output_dir}/openwrt-sdk-build.pem"
  mkdir -p "${work_dir}/verification-keys"
  cp public-key.pem "${work_dir}/verification-keys/build.pem"
  for package in "${output_dir}"/*.apk; do
    # Only our freshly built package is accepted unsigned at the signing step.
    staging_dir/host/bin/apk adbsign --allow-untrusted --sign-key private-key.pem "$package"
    staging_dir/host/bin/apk --keys-dir "${work_dir}/verification-keys" verify "$package"
  done
fi
printf 'SDK=%s\nSOURCE_COMMIT=%s\nTARGET=mediatek/filogic\n' "${sdk_version}" "$(git -C "$repo_dir" rev-parse HEAD)" > "${output_dir}/BUILD-INFO.txt"
grep "[ *]${archive}$" "${work_dir}/sha256sums" >> "${output_dir}/BUILD-INFO.txt"
(cd "${output_dir}" && find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
