#!/usr/bin/env bash
# Aplica en Supabase los scripts de sql/ que aún no se han ejecutado, en orden.
# Lleva el registro en la tabla migraciones_aplicadas. La primera vez marca como
# ya aplicados los scripts hasta el número BASE (se ejecutaron a mano antes).
#   SUPABASE_DB_URL=postgresql://...  scripts/aplicar-sql.sh           → aplica
#   SUPABASE_DB_URL=postgresql://...  scripts/aplicar-sql.sh --revisar → solo lista los pendientes
set -euo pipefail
: "${SUPABASE_DB_URL:?Falta el secreto SUPABASE_DB_URL (Settings → Secrets and variables → Actions)}"
BASE="${BASE:-010}"
MODO="${1:-}"
cd "$(dirname "$0")/.."
psql_() { psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -X "$@"; }

existe=$(psql_ -tAc "select to_regclass('public.migraciones_aplicadas') is not null")
if [ "$existe" != "t" ]; then
  if [ "$MODO" = "--revisar" ]; then
    aplicadas=""
    for f in sql/[0-9][0-9][0-9]_*.sql; do n=$(basename "$f"); [ "${n:0:3}" \> "$BASE" ] || aplicadas+="$n"$'\n'; done
  else
    psql_ -c "create table migraciones_aplicadas (archivo text primary key, aplicado_en timestamptz not null default now());
              alter table migraciones_aplicadas enable row level security;"
    for f in sql/[0-9][0-9][0-9]_*.sql; do
      n=$(basename "$f")
      if [ ! "${n:0:3}" \> "$BASE" ]; then psql_ -c "insert into migraciones_aplicadas (archivo) values ('$n') on conflict do nothing"; fi
    done
    aplicadas=$(psql_ -tAc "select archivo from migraciones_aplicadas")
  fi
else
  aplicadas=$(psql_ -tAc "select archivo from migraciones_aplicadas")
fi

pendientes=()
for f in sql/[0-9][0-9][0-9]_*.sql; do
  n=$(basename "$f")
  grep -qx "$n" <<<"$aplicadas" || pendientes+=("$f")
done

if [ ${#pendientes[@]} -eq 0 ]; then echo "La base de datos ya está al día."; exit 0; fi
echo "Pendientes:"; printf '  %s\n' "${pendientes[@]}"
[ "$MODO" = "--revisar" ] && exit 0

for f in "${pendientes[@]}"; do
  n=$(basename "$f")
  echo "→ Aplicando $n"
  # Todo el script y su registro van en una sola transacción: si falla, no queda a medias
  { cat "$f"; echo; echo "insert into migraciones_aplicadas (archivo) values ('$n');"; } | psql_ --single-transaction -f -
done
echo "Listo: base de datos al día."
