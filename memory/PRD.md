# PomodoroTrack - PRD

## Problema Original
SaaS de productividad basada en Pomodoros con sistema multi-tenant. 
- Usuario se registra con email/password
- Crea empresa (opcional al registro)
- Accede a dashboard con timer Pomodoro
- Aislamiento total de datos por empresa (companyId)

## Arquitectura
- **Frontend**: React 19 + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: Token-based authentication (SHA256)
- **Multi-tenant**: Isolation by companyId

## Entidades del Dominio
- **Company**: companyId, name, subscriptionStatus, ownerId, createdAt
- **User**: uid, email, displayName, companyId, role, token, createdAt
- **Project**: projectId, companyId, name, description, color, isActive
- **TimeEntry**: entryId, userId, companyId, projectId, duration, type, date

## Lo Implementado (v1.0 - 21 Enero 2026)
- [x] Autenticación completa (registro/login/logout)
- [x] Creación de empresa en registro
- [x] Dashboard con Timer Pomodoro (25min work, 5min break)
- [x] CRUD de Proyectos con colores personalizables
- [x] Registro de tiempo (pomodoros y descansos)
- [x] Estadísticas: Hoy, Esta Semana, Por Proyecto
- [x] Historial con calendario y filtros
- [x] Configuración de perfil y empresa
- [x] Diseño profesional: Magenta (#E91E63), Plus Jakarta Sans
- [x] Interfaz 100% en Español
- [x] Multi-tenant isolation por companyId

## Backlog Priorizado
### P0 (Crítico)
- [ ] Notificaciones de timer (Web Notifications API)
- [ ] Persistencia de timer al refrescar página

### P1 (Alta prioridad)
- [ ] Integración Firebase Auth (actualmente token simple)
- [ ] Personalización de tiempos de pomodoro
- [ ] Metas diarias/semanales

### P2 (Media prioridad)
- [ ] Invitar usuarios a empresa
- [ ] Reportes exportables (PDF/CSV)
- [ ] Temas claro/oscuro
- [ ] Sonidos personalizables

### P3 (Baja prioridad)
- [ ] Integración con calendario (Google Calendar)
- [ ] App móvil (PWA)
- [ ] API pública
- [ ] Facturación y pagos

## User Personas
1. **Profesional Independiente**: Trackea su tiempo para facturación
2. **Equipo Pequeño**: Coordina proyectos y mide productividad
3. **Estudiante**: Usa Pomodoro para sesiones de estudio

## Próximos Pasos
1. Agregar Web Notifications para alertas de timer
2. Implementar persistencia del timer en localStorage
3. Considerar migración a Firebase Auth para producción
