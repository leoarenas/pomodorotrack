# PomodoroTrack - PRD v1.1

## Problema Original
SaaS de productividad basada en Pomodoros con sistema multi-tenant. 
- Usuario se registra con email/password
- Crea empresa (opcional al registro)
- Accede a dashboard con timer Pomodoro
- Aislamiento total de datos por empresa (companyId)

## Arquitectura
- **Frontend**: React 19 + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: Token-based (backend) + Firebase Auth (configurado)
- **Multi-tenant**: Isolation by companyId

## Lo Implementado (v1.1 - 21 Enero 2026)

### Core Features
- [x] Autenticación completa (registro/login/logout)
- [x] Creación de empresa en registro (opcional)
- [x] Dashboard con Timer Pomodoro (25min work, 5min break)
- [x] **Modal de actividad** - solicita descripción antes de iniciar timer
- [x] CRUD de Proyectos con colores personalizables
- [x] Registro de tiempo (pomodoros y descansos con notas)
- [x] Estadísticas: Hoy, Esta Semana, Por Proyecto
- [x] Historial con calendario y filtros
- [x] Configuración de perfil y empresa

### Mejoras v1.1
- [x] **Bug Fix**: Input de proyectos ya no pierde foco
- [x] **Web Notifications**: Alertas del navegador al completar pomodoro
- [x] **Persistencia localStorage**: Timer se mantiene al refrescar
- [x] **Firebase Auth configurado**: Listo para producción (necesita autorizar dominio)
- [x] **Sesión persistente**: Navegación sin logout inesperado

### Diseño
- Tema claro profesional con acentos magenta (#E91E63)
- Tipografía: Plus Jakarta Sans (headings), Inter (body)
- Interfaz 100% en Español
- Responsive design

## Firebase Configuration
```
apiKey: AIzaSyDq1MJ4lsofR1phHKvl-xUrVLEsstIREEM
authDomain: pomodorotrack.firebaseapp.com
projectId: pomodorotrack
```

**IMPORTANTE**: Para activar Firebase Auth en producción:
1. Ve a Firebase Console → Authentication → Settings
2. Agregar dominio autorizado: `prodtimer-2.preview.emergentagent.com`

## Backlog Priorizado

### P0 (Crítico)
- [ ] Autorizar dominio en Firebase para auth en producción

### P1 (Alta prioridad)
- [ ] Personalización de tiempos de pomodoro
- [ ] Metas diarias/semanales
- [ ] Sonidos personalizables

### P2 (Media prioridad)
- [ ] Invitar usuarios a empresa
- [ ] Reportes exportables (PDF/CSV)
- [ ] Temas claro/oscuro

### P3 (Baja prioridad)
- [ ] Integración con calendario (Google Calendar)
- [ ] App móvil (PWA)
- [ ] API pública
- [ ] Facturación y pagos

## User Personas
1. **Profesional Independiente**: Trackea su tiempo para facturación
2. **Equipo Pequeño**: Coordina proyectos y mide productividad
3. **Estudiante**: Usa Pomodoro para sesiones de estudio

## Entidades del Dominio
- **Company**: companyId, name, subscriptionStatus, ownerId, createdAt
- **User**: uid, email, displayName, companyId, role, token, createdAt
- **Project**: projectId, companyId, name, description, color, isActive
- **TimeEntry**: entryId, userId, companyId, projectId, duration, type, notes, date
