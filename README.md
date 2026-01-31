# KOntrak — Panel de Administración

Panel de administración independiente para Kontrak. Diseñado para ejecutarse en un **repositorio y dominio separados** del sitio público para mayor seguridad.

## Requisitos

- Node.js 18+
- Base de datos PostgreSQL (la misma que el cliente o una dedicada)
- Cuenta de usuario con rol **ADMINISTRADOR** en la base de datos

## Política de contraseña (solo admin)

Para iniciar sesión en este panel, la contraseña del administrador debe cumplir:

- Mínimo 8 caracteres
- Alfanumérico (letras y números)
- Al menos una mayúscula, una minúscula y un número
- Sin secuencias consecutivas (123, abc, 321, cba)
- Sin más de 2 caracteres repetidos seguidos (aaa, 111)

## Instalación

```bash
cp .env.example .env
# Editar .env con DATABASE_URL, DIRECT_URL, NEXTAUTH_URL, NEXTAUTH_SECRET

npm install
npx prisma generate
```

## Desarrollo

```bash
npm run dev
```

El panel corre en **http://localhost:3001** (puerto distinto al cliente).

## Producción

- Desplegar en un dominio distinto al cliente (ej. `admin.midominio.com`).
- Usar `NEXTAUTH_URL` y `NEXTAUTH_SECRET` propios del admin.
- Ver [docs/SEGURIDAD_ADMIN.md](docs/SEGURIDAD_ADMIN.md) para recomendaciones de seguridad (WAF, VPN, cookies, etc.).

## Estructura

- `/login` — Inicio de sesión (solo rol ADMINISTRADOR, contraseña estricta)
- `/dashboard` — Inicio del panel (estadísticas, accesos rápidos)
- `/dashboard/vehiculos` — CRUD de productos/vehículos
- `/dashboard/reservas` — Reservas (placeholder)
- `/dashboard/usuarios` — Usuarios (placeholder)

## Repositorio independiente

Puedes copiar esta carpeta a un nuevo repositorio Git y desplegarla por separado. No incluye código del sitio público; solo se conecta a la misma base de datos.
