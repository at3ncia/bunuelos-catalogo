-- ============================================================================
-- Botón "Reiniciar" de agotados en /admin → Ajustes, por sede: lo marcado como
-- agotado en esa sede vuelve a estar disponible. Se puede ejecutar más de una vez.
-- ============================================================================

drop function if exists admin_reiniciar_agotados(text);

create or replace function admin_reiniciar_agotados(p_clave text, p_sede int)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json; n int;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  update sede_productos set disponible = true, actualizado_en = now()
   where sede_id = p_sede and not disponible;
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'reiniciados', n);
end $$;

grant execute on function admin_reiniciar_agotados(text, int) to anon, authenticated;
