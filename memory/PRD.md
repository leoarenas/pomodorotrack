# PomodoroTrack - PRD v1.2

## Problema Original
SaaS de productividad basada en Pomodoros con sistema multi-tenant.

## Lo Implementado (v1.2 - 21 Enero 2026)

### Core Features
- [x] Autenticación completa (registro/login/logout)
- [x] Creación de empresa en registro (opcional)
- [x] Dashboard con Timer Pomodoro personalizable
- [x] Modal de actividad obligatorio antes de iniciar timer
- [x] CRUD de Proyectos con colores personalizables
- [x] Registro de tiempo (pomodoros y descansos con notas)
- [x] Estadísticas: Hoy, Esta Semana, Por Proyecto
- [x] Historial con calendario y filtros
- [x] Configuración de perfil y empresa

### Mejoras v1.2 - Personalización
- [x] **Duración de Pomodoro configurable** (1-120 min)
- [x] **Duración de Descanso corto configurable** (1-60 min)
- [x] **Duración de Descanso largo configurable** (1-60 min)
- [x] **Pomodoros hasta descanso largo** configurable (1-10)
- [x] **4 sonidos de notificación**: Campana, Campanilla, Digital, Suave
- [x] **Control de volumen** con slider (0-100%)
- [x] **Botón restablecer** valores por defecto
- [x] **Persistencia** de configuración en localStorage
- [x] **Botón Skip** para omitir sesión actual
- [x] Timer refleja duración configurada en tiempo real

### Mejoras v1.1
- [x] Bug Fix: Input de proyectos ya no pierde foco
- [x] Web Notifications para alertas
- [x] Persistencia del timer en localStorage
- [x] Sesión persistente sin logout inesperado

### Diseño
- Tema claro profesional con acentos magenta (#E91E63)
- Tipografía: Plus Jakarta Sans, Inter
- Interfaz 100% en Español
- Responsive design

## Firebase Configuration (Pendiente)
```
apiKey: AIzaSyDq1MJ4lsofR1phHKvl-xUrVLEsstIREEM
authDomain: pomodorotrack.firebaseapp.com
projectId: pomodorotrack
```
**NOTA**: Para activar Firebase Auth:
Firebase Console → Authentication → Settings → Agregar dominio autorizado

## Backlog

### P1 (Alta prioridad)
- [ ] Autorizar dominio en Firebase
- [ ] Metas diarias/semanales con progreso visual
- [ ] Estadísticas más detalladas

### P2 (Media prioridad)
- [ ] Invitar usuarios a empresa
- [ ] Reportes exportables (PDF/CSV)
- [ ] Temas claro/oscuro

### P3 (Baja prioridad)
- [ ] Integración con Google Calendar
- [ ] PWA (App móvil)
- [ ] API pública
- [ ] Facturación y pagos
