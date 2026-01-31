# Seguridad del Panel de Administración

Este panel de administración está pensado para ejecutarse **en un repositorio y despliegue separados** del sitio público (cliente), con el fin de mejorar la seguridad y el aislamiento.

## Ventajas de separar Admin y Cliente

### 1. Reducción de la superficie de ataque
- Si un atacante encuentra una vulnerabilidad (por ejemplo XSS) en la aplicación cliente, **no tiene acceso al código ni a la estructura de rutas del administrador**.
- Las rutas del admin (`/dashboard`, `/login`) no existen en el dominio del cliente, por lo que no pueden ser exploradas ni explotadas desde ahí.

### 2. Políticas de red (WAF / VPN)
- Puedes **restringir el acceso al dominio del administrador** por IP (solo oficina, solo VPN).
- Puedes exigir **VPN** o **certificados de cliente** para acceder al panel, sin afectar a los usuarios finales del sitio público.
- Un WAF (Web Application Firewall) puede aplicar reglas más estrictas solo al dominio del admin.

### 3. Aislamiento de cookies y sesiones
- Al usar **dominios diferentes** (por ejemplo `app.ejemplo.com` para cliente y `admin.ejemplo.com` para admin), las **cookies de sesión no se comparten**.
- Esto reduce el riesgo de **Session Hijacking** cruzado: robar la cookie del cliente no da acceso al panel admin, y viceversa.

### 4. Menos fugas de información
- En una app unificada es fácil que por error se envíen metadatos, rutas o fragmentos del admin al cliente.
- Con aplicaciones separadas, el build del cliente **no incluye** código ni rutas del admin.

---

## Política de contraseña (Admin)

El login del panel admin exige una **política de contraseña estricta** solo para acceder a este panel:

- **Mínimo 8 caracteres**
- **Alfanumérico**: solo letras (a-z, A-Z) y números (0-9)
- **Al menos una mayúscula, una minúscula y un número**
- **Sin secuencias consecutivas**: no se permiten cadenas como `123`, `abc`, `321`, `cba`
- **Sin más de 2 caracteres repetidos seguidos**: no se permiten `aaa`, `111`, etc.

Los administradores deben usar una contraseña que cumpla estas reglas para poder iniciar sesión en el panel. Si la contraseña actual no las cumple, debe cambiarse (por ejemplo desde el cliente o por un superadmin) antes de acceder al admin.

---

## Recomendaciones de despliegue

1. **Dominio distinto**: Desplegar el admin en un subdominio dedicado (ej. `admin.midominio.com`) con su propio `NEXTAUTH_URL` y `NEXTAUTH_SECRET` distinto al del cliente.
2. **Secret distinto**: Usar un `NEXTAUTH_SECRET` diferente y fuerte (mín. 32 caracteres) solo para el admin.
3. **Restricción por IP / VPN**: En el proxy o WAF, limitar el acceso a `/` del admin solo a IPs de confianza o a usuarios que pasen por VPN.
4. **Sesión corta**: En este proyecto la sesión del admin tiene `maxAge: 60 * 60` (1 hora); puedes acortarla aún más si lo deseas.
5. **HTTPS**: Usar siempre HTTPS en producción para el dominio del admin.

---

## Variables de entorno

- `DATABASE_URL` / `DIRECT_URL`: Misma base de datos que el cliente (o una dedicada) para leer/actualizar vehículos, reservas, usuarios.
- `NEXTAUTH_URL`: URL pública del panel admin (ej. `https://admin.midominio.com`).
- `NEXTAUTH_SECRET`: Secret único para el admin (no reutilizar el del cliente).
- `NEXT_PUBLIC_CLIENT_URL` (opcional): URL del sitio público, para el enlace "Sitio público" en el sidebar.
