-- Actualizar políticas RLS para permitir a usuarios autenticados crear torneos

-- Primero, eliminar la política existente
DROP POLICY IF EXISTS "Los managers pueden crear torneos" ON tournaments;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear torneos" ON tournaments;

-- Crear nueva política más permisiva
CREATE POLICY "Usuarios autenticados pueden crear torneos"
ON tournaments FOR INSERT 
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Verificar que las otras políticas existan
DROP POLICY IF EXISTS "Cualquiera puede ver torneos" ON tournaments;
CREATE POLICY "Cualquiera puede ver torneos"
ON tournaments FOR SELECT 
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Los creadores pueden actualizar sus torneos" ON tournaments;
CREATE POLICY "Los creadores pueden actualizar sus torneos"
ON tournaments FOR UPDATE 
TO authenticated
USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Los creadores pueden eliminar sus torneos" ON tournaments;
CREATE POLICY "Los creadores pueden eliminar sus torneos"
ON tournaments FOR DELETE 
TO authenticated
USING (creator_id = auth.uid());
