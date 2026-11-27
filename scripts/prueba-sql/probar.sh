#!/usr/bin/env bash
# Prueba los scripts de sql/ en un Postgres vacío: todos en orden, y luego todos otra vez
# (deben poder ejecutarse más de una vez). Luego prueba el aplicador automático.
#   PRUEBA_DB_URL=postgresql://postgres@localhost:5432/postgres scripts/prueba-sql/probar.sh
set -euo pipefail
: "${PRUEBA_DB_URL:?Falta PRUEBA_DB_URL (un Postgres vacío, nunca el de producción)}"
cd "$(dirname "$0")/../.."
psql_() { psql "$PRUEBA_DB_URL" -v ON_ERROR_STOP=1 -q -X "$@"; }
psql_ -f scripts/prueba-sql/base.sql
for vuelta in 1 2; do
  for f in sql/[0-9][0-9][0-9]_*.sql; do
    # La 2.ª vuelta solo para los scripts nuevos (los de antes de BASE ya corrieron en producción)
    if [ "$vuelta" = 2 ] && [ ! "$(basename "$f" | cut -c1-3)" \> "${BASE:-010}" ]; then continue; fi
    echo "vuelta $vuelta · $(basename "$f")"
    psql_ --single-transaction -f "$f" >/dev/null 2> >(grep -v "NOTICE\|WARNING\|transaction in progress" >&2)
    # 002 (contraseñas de sedes) no está versionado: se cargan sedes de prueba
    if [ "$(basename "$f")" = "001_sedes.sql" ]; then
      psql_ -c "insert into sedes (nombre, ciudad, clave_hash) select x, x, crypt('Prueba123', gen_salt('bf'))
                from unnest(array['Cartagena','Barranquilla']) x where not exists (select 1 from sedes)"
    fi
  done
done
echo "→ Aplicador automático (primera vez y al día)"
psql_ -c "drop table if exists migraciones_aplicadas"
SUPABASE_DB_URL="$PRUEBA_DB_URL" BASE=010 scripts/aplicar-sql.sh
SUPABASE_DB_URL="$PRUEBA_DB_URL" scripts/aplicar-sql.sh
echo "→ Funciones nuevas"; psql_ -f scripts/prueba-sql/funciones.sql
echo "✓ Todos los scripts de sql/ funcionan y se pueden repetir."
