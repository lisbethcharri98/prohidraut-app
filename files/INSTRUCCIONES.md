# PROHIDRAUT — Guía de instalación paso a paso

## PASO 1: Crear el proyecto en Supabase (10 min)

1. Ve a https://supabase.com y crea una cuenta gratis
2. Click "New project"
   - Organization: (la que se crea automáticamente)
   - Name: prohidraut
   - Database Password: (pon una contraseña fuerte y GUÁRDALA)
   - Region: South America (São Paulo)
3. Espera 2 minutos que se cree el proyecto

## PASO 2: Crear las tablas (2 min)

1. En el dashboard de Supabase, click en "SQL Editor" (ícono de código)
2. Click "New query"
3. Abre el archivo 01_supabase_schema.sql
4. Copia TODO el contenido y pégalo en el editor
5. Click "Run" (o Ctrl+Enter)
6. Debe decir "Success. No rows returned"

## PASO 3: Crear los usuarios (5 min)

1. En Supabase, ve a "Authentication" → "Users"
2. Click "Add user" → "Create new user" para cada persona:
   - Tu papá: jorge@prohidraut.com / contraseña
   - Rubén: ruben@prohidraut.com / contraseña
   - David: david@prohidraut.com / contraseña
   - Tú: lisbeth@prohidraut.com / contraseña
3. Activa "Auto Confirm User" para que no necesiten verificar email

## PASO 4: Obtener las credenciales

1. En Supabase, ve a "Project Settings" → "API"
2. Copia:
   - Project URL → reemplaza SUPABASE_URL en App.jsx
   - anon (public) key → reemplaza SUPABASE_ANON_KEY en App.jsx

## PASO 5: Crear el proyecto React (15 min)

Abre una terminal (cmd o PowerShell en Windows):

```bash
# Crear el proyecto
npm create vite@latest prohidraut-app -- --template react
cd prohidraut-app

# Instalar dependencias
npm install
npm install @supabase/supabase-js

# Reemplazar src/App.jsx con el contenido del archivo App.jsx
# (copia y pega el contenido del App.jsx en src/App.jsx)

# Borrar src/App.css y src/index.css si existen
# En src/main.jsx eliminar la línea: import './index.css'

# Correr localmente
npm run dev
```

La app abre en http://localhost:5173

## PASO 6: Subir a Vercel (10 min, para que Rubén y David accedan)

1. Ve a https://vercel.com y crea cuenta con GitHub
2. Sube el proyecto a GitHub:
   ```bash
   git init
   git add .
   git commit -m "PROHIDRAUT app inicial"
   # Crea un repo en github.com y sigue las instrucciones
   ```
3. En Vercel: "New Project" → importa el repo de GitHub
4. Deploy automático → te da una URL pública tipo:
   https://prohidraut-app.vercel.app

## MÓDULOS LISTOS EN ESTA VERSIÓN:
- ✅ Login con usuarios de Supabase
- ✅ Pipeline (vista general de servicios)
- ✅ Trabajadores (con recordatorio SCTR y control de vacaciones)
- ✅ Clientes (con búsqueda)
- ✅ Almacén (con alertas de stock bajo, entradas, precios)
- ✅ Horas-hombre semanal (con asignación a OC o códigos admin)
- ✅ Gastos fijos mensuales (con categorías editables)

## MÓDULOS PRÓXIMA ITERACIÓN:
- Cotizaciones + generación PDF (formato del Excel enviado)
- Órdenes de compra con gastos asociados
- Equipos/Cilindros (base técnica)
- Servicios históricos por cliente
- Rentabilidad por servicio y mensual
- Export Excel para contador

## MANTENER SUPABASE ACTIVO (plan gratuito)

El plan gratuito pausa el proyecto si no hay actividad por 7 días.
Para evitarlo, una vez que la app esté en Vercel, simplemente
usarla al menos una vez por semana es suficiente.

Backup manual (hacer 1 vez al mes):
1. Supabase → Settings → Database
2. "Backups" → descargar el más reciente
3. Guardar en Google Drive carpeta "PROHIDRAUT/Backups"
