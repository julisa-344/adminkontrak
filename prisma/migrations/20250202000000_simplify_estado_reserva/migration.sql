-- Migration: Simplificar EstadoReserva de 8 a 4 valores
-- Convertir estados existentes antes de modificar el enum

-- 1. Primero convertir los estados que se van a eliminar a valores válidos
-- RECHAZADA -> CANCELADA
-- ESPERANDO_CLIENTE -> CONFIRMADA
-- EN_USO -> CONFIRMADA
-- ESPERANDO_PROPIETARIO -> CONFIRMADA

UPDATE reserva SET estado = 'CANCELADA' WHERE estado = 'RECHAZADA';
UPDATE reserva SET estado = 'CONFIRMADA' WHERE estado = 'ESPERANDO_CLIENTE';
UPDATE reserva SET estado = 'CONFIRMADA' WHERE estado = 'EN_USO';
UPDATE reserva SET estado = 'CONFIRMADA' WHERE estado = 'ESPERANDO_PROPIETARIO';

-- 2. Crear el nuevo enum temporal
CREATE TYPE "EstadoReserva_new" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'FINALIZADA', 'CANCELADA');

-- 3. Cambiar la columna al nuevo tipo
ALTER TABLE reserva 
  ALTER COLUMN estado DROP DEFAULT,
  ALTER COLUMN estado TYPE "EstadoReserva_new" USING (estado::text::"EstadoReserva_new"),
  ALTER COLUMN estado SET DEFAULT 'PENDIENTE';

-- 4. Eliminar el enum antiguo
DROP TYPE "EstadoReserva";

-- 5. Renombrar el nuevo enum al nombre original
ALTER TYPE "EstadoReserva_new" RENAME TO "EstadoReserva";
