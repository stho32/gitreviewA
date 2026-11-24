#!/usr/bin/env bash
# Veröffentlicht gitreviewA je Plattform als genau eine Datei (R00009).
#   skripte/veroeffentlichen.sh [Plattform ...]    Standard: linux-x64 win-x64 osx-arm64
# Ausgabe: <AUSGABE>/<Plattform>/gitreviewA[.exe]; AUSGABE ist standardmäßig `veroeffentlicht/` im Wurzelordner.
# stdout: nur die Pfade der erzeugten Dateien, eine Zeile je Plattform; Meldungen stehen auf stderr.
set -euo pipefail

wurzel="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ausgabe="${AUSGABE:-$wurzel/veroeffentlicht}"
bekannte=(linux-x64 win-x64 osx-arm64 linux-arm64 osx-x64)

fehler() {
  echo "veroeffentlichen: $*" >&2
  exit 1
}

ist_bekannt() {
  local kandidat
  for kandidat in "${bekannte[@]}"; do
    [[ "$kandidat" == "$1" ]] && return 0
  done
  return 1
}

dateiname_fuer() {
  if [[ "$1" == win-* ]]; then
    echo "gitreviewA.exe"
  else
    echo "gitreviewA"
  fi
}

veroeffentliche() {
  local plattform="$1" ordner="$ausgabe/$1" dateiname anzahl
  dateiname="$(dateiname_fuer "$plattform")"
  rm -rf "$ordner"
  echo "veroeffentlichen: $plattform ..." >&2
  dotnet publish "$wurzel/src/GitReviewA" -c Release -r "$plattform" -o "$ordner" --nologo -v q >&2 \
    || fehler "Veröffentlichen für $plattform ist gescheitert"
  anzahl="$(find "$ordner" -type f | wc -l)"
  [[ "$anzahl" -eq 1 && -f "$ordner/$dateiname" ]] \
    || fehler "$plattform: erwartet genau die Datei $dateiname, gefunden $anzahl Datei(en) in $ordner"
  echo "$ordner/$dateiname"
}

plattformen=("$@")
[[ ${#plattformen[@]} -gt 0 ]] || plattformen=(linux-x64 win-x64 osx-arm64)

for plattform in "${plattformen[@]}"; do
  ist_bekannt "$plattform" || fehler "unbekannte Plattform: $plattform (bekannt: ${bekannte[*]})"
done

for plattform in "${plattformen[@]}"; do
  veroeffentliche "$plattform"
done
