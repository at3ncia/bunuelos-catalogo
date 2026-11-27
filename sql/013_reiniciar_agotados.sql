-- ============================================================================
-- Botón "Reiniciar ahora" en /admin → Ajustes: todo lo marcado como agotado
-- vuelve a estar disponible en todas las sedes. Se puede ejecutar más de una vez.
-- ============================================================================

create or replace function admin_reiniciar_agotados(p_clave text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json; n int;
begin
  r := admin_verificar(p_clave);
  if not (r->>'ok')::boolean then return r; end if;
  update sede_productos set disponible = true, actualizado_en = now() where not disponible;
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'reiniciados', n);
end $$;

grant execute on function admin_reiniciar_agotados(text) to anon, authenticated;
