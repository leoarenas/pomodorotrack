import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { projectsApi, timeEntriesApi, statsApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  Target, 
  Clock, 
  Flame,
  TrendingUp,
  CheckCircle2,
  Bell,
  BellOff
} from 'lucide-react';
import { toast } from 'sonner';

// Timer states
const TIMER_STATES = {
  IDLE: 'idle',
  WORK: 'work',
  BREAK: 'break',
  LONG_BREAK: 'long_break'
};

// Timer durations in seconds
const DURATIONS = {
  work: 25 * 60,
  break: 5 * 60,
  long_break: 15 * 60
};

// LocalStorage keys
const STORAGE_KEYS = {
  TIMER_STATE: 'pomodorotrack_timer_state',
  TIME_LEFT: 'pomodorotrack_time_left',
  PROJECT_ID: 'pomodorotrack_project_id',
  ACTIVITY: 'pomodorotrack_activity',
  START_TIME: 'pomodorotrack_start_time',
  IS_RUNNING: 'pomodorotrack_is_running'
};

export const DashboardPage = () => {
  const { user, company } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [timerState, setTimerState] = useState(TIMER_STATES.IDLE);
  const [timeLeft, setTimeLeft] = useState(DURATIONS.work);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosToday, setPomodorosToday] = useState(0);
  const [todayStats, setTodayStats] = useState(null);
  const [weekStats, setWeekStats] = useState(null);
  const [projectStats, setProjectStats] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Activity modal state
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityDescription, setActivityDescription] = useState('');
  
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Tu navegador no soporta notificaciones');
      return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      toast.success('Notificaciones activadas');
    } else {
      toast.error('Permiso de notificaciones denegado');
    }
  };

  // Send notification
  const sendNotification = (title, body) => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'pomodorotrack-timer'
      });
    }
  };

  // Load persisted timer state
  useEffect(() => {
    const savedTimerState = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    const savedTimeLeft = localStorage.getItem(STORAGE_KEYS.TIME_LEFT);
    const savedProjectId = localStorage.getItem(STORAGE_KEYS.PROJECT_ID);
    const savedActivity = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
    const savedIsRunning = localStorage.getItem(STORAGE_KEYS.IS_RUNNING);
    const savedStartTime = localStorage.getItem(STORAGE_KEYS.START_TIME);
    
    if (savedTimerState && savedTimerState !== TIMER_STATES.IDLE) {
      setTimerState(savedTimerState);
      setActivityDescription(savedActivity || '');
      
      if (savedIsRunning === 'true' && savedStartTime) {
        // Calculate elapsed time since page was closed
        const elapsed = Math.floor((Date.now() - parseInt(savedStartTime)) / 1000);
        const remaining = parseInt(savedTimeLeft) - elapsed;
        
        if (remaining > 0) {
          setTimeLeft(remaining);
          setIsRunning(true);
        } else {
          // Timer would have completed
          setTimeLeft(0);
          setTimerState(TIMER_STATES.IDLE);
          clearPersistedTimer();
        }
      } else {
        setTimeLeft(parseInt(savedTimeLeft) || DURATIONS.work);
      }
    }
    
    if (savedProjectId) {
      setSelectedProject(savedProjectId);
    }
    
    // Check notification permission
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
    
    // Create audio element
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Persist timer state
  const persistTimerState = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, timerState);
    localStorage.setItem(STORAGE_KEYS.TIME_LEFT, timeLeft.toString());
    localStorage.setItem(STORAGE_KEYS.PROJECT_ID, selectedProject || '');
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, activityDescription);
    localStorage.setItem(STORAGE_KEYS.IS_RUNNING, isRunning.toString());
    if (isRunning) {
      localStorage.setItem(STORAGE_KEYS.START_TIME, Date.now().toString());
    }
  }, [timerState, timeLeft, selectedProject, activityDescription, isRunning]);

  // Clear persisted timer
  const clearPersistedTimer = () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  };

  // Persist on state changes
  useEffect(() => {
    if (timerState !== TIMER_STATES.IDLE) {
      persistTimerState();
    }
  }, [timerState, timeLeft, isRunning, persistTimerState]);

  // Load initial data
  useEffect(() => {
    loadProjects();
    loadStats();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
      
      // Auto-select first project if none selected
      const savedProjectId = localStorage.getItem(STORAGE_KEYS.PROJECT_ID);
      if (response.data.length > 0) {
        if (savedProjectId && response.data.find(p => p.projectId === savedProjectId)) {
          setSelectedProject(savedProjectId);
        } else if (!selectedProject) {
          setSelectedProject(response.data[0].projectId);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadStats = async () => {
    try {
      const [todayRes, weekRes, projectRes] = await Promise.all([
        statsApi.getToday(),
        statsApi.getWeek(),
        statsApi.getByProject()
      ]);
      setTodayStats(todayRes.data);
      setWeekStats(weekRes.data);
      setProjectStats(projectRes.data);
      setPomodorosToday(todayRes.data.pomodorosCompleted || 0);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Open activity modal before starting timer
  const handleStartClick = () => {
    if (!selectedProject && projects.length > 0) {
      toast.error('Selecciona un proyecto primero');
      return;
    }
    
    if (projects.length === 0) {
      toast.error('Crea un proyecto primero en la sección Proyectos');
      return;
    }
    
    // If timer was paused, just resume
    if (timerState === TIMER_STATES.WORK && !isRunning) {
      setIsRunning(true);
      return;
    }
    
    // Show activity modal for new session
    setShowActivityModal(true);
  };

  // Start timer after activity is set
  const startTimerWithActivity = () => {
    if (!activityDescription.trim()) {
      toast.error('Por favor, describe la actividad');
      return;
    }
    
    setShowActivityModal(false);
    setTimerState(TIMER_STATES.WORK);
    setTimeLeft(DURATIONS.work);
    setIsRunning(true);
    
    toast.success(`Iniciando: ${activityDescription}`, {
      description: '25 minutos de enfoque'
    });
  };

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimerState(TIMER_STATES.IDLE);
    setTimeLeft(DURATIONS.work);
    setActivityDescription('');
    clearPersistedTimer();
  }, []);

  const startBreak = useCallback((isLong = false) => {
    setTimerState(isLong ? TIMER_STATES.LONG_BREAK : TIMER_STATES.BREAK);
    setTimeLeft(isLong ? DURATIONS.long_break : DURATIONS.break);
    setIsRunning(true);
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = async () => {
    setIsRunning(false);
    
    // Play notification sound
    try {
      audioRef.current?.play();
    } catch (e) {}
    
    if (timerState === TIMER_STATES.WORK) {
      // Save completed pomodoro
      if (selectedProject) {
        try {
          await timeEntriesApi.create({
            projectId: selectedProject,
            duration: DURATIONS.work,
            type: 'pomodoro',
            notes: activityDescription
          });
          setPomodorosToday(prev => prev + 1);
          loadStats();
        } catch (error) {
          console.error('Error saving pomodoro:', error);
        }
      }
      
      // Send notification
      sendNotification('¡Pomodoro completado! 🍅', `"${activityDescription}" - Toma un descanso de 5 minutos`);
      
      toast.success('¡Pomodoro completado! 🍅', {
        description: `"${activityDescription}" - Toma un descanso`,
        action: {
          label: 'Iniciar descanso',
          onClick: () => startBreak(false)
        }
      });
      
      setTimerState(TIMER_STATES.IDLE);
      setTimeLeft(DURATIONS.work);
      setActivityDescription('');
      clearPersistedTimer();
    } else {
      // Break completed - save break time
      if (selectedProject) {
        try {
          await timeEntriesApi.create({
            projectId: selectedProject,
            duration: timerState === TIMER_STATES.LONG_BREAK ? DURATIONS.long_break : DURATIONS.break,
            type: 'break',
            notes: 'Descanso'
          });
        } catch (error) {
          console.error('Error saving break:', error);
        }
      }
      
      // Send notification
      sendNotification('¡Descanso terminado!', '¿Listo para otro pomodoro?');
      
      toast.success('¡Descanso terminado!', {
        description: '¿Listo para otro pomodoro?'
      });
      
      setTimerState(TIMER_STATES.IDLE);
      setTimeLeft(DURATIONS.work);
      clearPersistedTimer();
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const getProgress = () => {
    const total = timerState === TIMER_STATES.WORK ? DURATIONS.work :
                  timerState === TIMER_STATES.BREAK ? DURATIONS.break :
                  timerState === TIMER_STATES.LONG_BREAK ? DURATIONS.long_break :
                  DURATIONS.work;
    return ((total - timeLeft) / total) * 100;
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const selectedProjectData = projects.find(p => p.projectId === selectedProject);

  return (
    <div className="p-6 lg:p-8 space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            ¡Hola, {user?.displayName?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {company ? company.name : 'Tu espacio de productividad'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={requestNotificationPermission}
            title={notificationsEnabled ? 'Notificaciones activadas' : 'Activar notificaciones'}
            data-testid="notifications-btn"
          >
            {notificationsEnabled ? (
              <Bell className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
          </Button>
          <Badge variant="secondary" className="px-4 py-2">
            <Flame className="w-4 h-4 mr-2 text-primary" />
            {pomodorosToday} pomodoros hoy
          </Badge>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="bento-grid">
        {/* Timer Card - Hero */}
        <Card className="col-span-full md:col-span-2 lg:col-span-2 row-span-2 card-hover" data-testid="timer-card">
          <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            {/* Project Selector */}
            <div className="w-full max-w-xs mb-4">
              <Select value={selectedProject || ''} onValueChange={setSelectedProject}>
                <SelectTrigger data-testid="project-selector" className="w-full">
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.projectId} value={project.projectId}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current Activity Display */}
            {activityDescription && timerState !== TIMER_STATES.IDLE && (
              <div className="mb-4 px-4 py-2 bg-muted rounded-lg max-w-xs text-center">
                <p className="text-sm text-muted-foreground">Actividad actual:</p>
                <p className="font-medium truncate">{activityDescription}</p>
              </div>
            )}

            {/* Timer Display */}
            <div className="relative mb-8">
              <div className={`timer-display transition-colors duration-300 ${
                timerState === TIMER_STATES.WORK ? 'text-foreground' :
                timerState === TIMER_STATES.BREAK || timerState === TIMER_STATES.LONG_BREAK ? 'text-emerald-500' :
                'text-foreground'
              }`} data-testid="timer-display">
                {formatTime(timeLeft)}
              </div>
              
              {isRunning && (
                <div className="absolute -inset-4 rounded-full border-4 border-primary/20 animate-pulse-ring" />
              )}
            </div>

            {/* Progress */}
            <div className="w-full max-w-md mb-8">
              <Progress 
                value={getProgress()} 
                className="h-2"
              />
              <p className="text-center text-sm text-muted-foreground mt-2">
                {timerState === TIMER_STATES.IDLE && 'Listo para comenzar'}
                {timerState === TIMER_STATES.WORK && 'Tiempo de enfoque'}
                {timerState === TIMER_STATES.BREAK && 'Descanso corto'}
                {timerState === TIMER_STATES.LONG_BREAK && 'Descanso largo'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {!isRunning ? (
                <Button 
                  size="lg" 
                  className="btn-primary rounded-full w-16 h-16"
                  onClick={handleStartClick}
                  data-testid="start-timer-btn"
                >
                  <Play className="w-6 h-6 ml-1" />
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="rounded-full w-16 h-16"
                  onClick={pauseTimer}
                  data-testid="pause-timer-btn"
                >
                  <Pause className="w-6 h-6" />
                </Button>
              )}
              
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-full w-12 h-12"
                onClick={resetTimer}
                data-testid="reset-timer-btn"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              
              {timerState === TIMER_STATES.IDLE && (
                <Button 
                  size="lg" 
                  variant="outline"
                  className="rounded-full px-6"
                  onClick={() => startBreak(false)}
                  data-testid="break-btn"
                >
                  <Coffee className="w-5 h-5 mr-2" />
                  Descanso
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today Stats */}
        <Card className="card-hover" data-testid="today-stats-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pomodorosToday}</div>
            <p className="text-sm text-muted-foreground">pomodoros</p>
            {todayStats && (
              <p className="text-sm text-primary mt-2 font-medium">
                {formatDuration(todayStats.totalWorkTime)} trabajados
              </p>
            )}
          </CardContent>
        </Card>

        {/* Week Stats */}
        <Card className="card-hover" data-testid="week-stats-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Esta Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{weekStats?.totalPomodoros || 0}</div>
            <p className="text-sm text-muted-foreground">pomodoros</p>
            {weekStats && (
              <p className="text-sm text-emerald-600 mt-2 font-medium">
                {formatDuration(weekStats.totalTime)} total
              </p>
            )}
          </CardContent>
        </Card>

        {/* Current Session */}
        <Card className="card-hover" data-testid="session-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Sesión Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: selectedProjectData?.color }}>
              {selectedProjectData?.name?.slice(0, 8) || '-'}
            </div>
            <p className="text-sm text-muted-foreground">
              {timerState === TIMER_STATES.IDLE ? 'Sin iniciar' :
               timerState === TIMER_STATES.WORK ? 'En progreso' :
               'Descansando'}
            </p>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="card-hover" data-testid="streak-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Racha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">
              {Object.values(weekStats?.dailyStats || {}).filter(d => d.pomodoros > 0).length}
            </div>
            <p className="text-sm text-muted-foreground">días activos</p>
          </CardContent>
        </Card>

        {/* Projects Overview */}
        <Card className="col-span-full md:col-span-2 row-span-2 card-hover" data-testid="projects-overview-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Tiempo por Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay datos aún. ¡Completa tu primer pomodoro!
              </p>
            ) : (
              projectStats.map(stat => {
                const maxTime = Math.max(...projectStats.map(s => s.totalTime));
                const percentage = maxTime > 0 ? (stat.totalTime / maxTime) * 100 : 0;
                
                return (
                  <div key={stat.projectId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="font-medium">{stat.projectName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(stat.totalTime)} · {stat.pomodoros} 🍅
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: stat.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Weekly Chart */}
        <Card className="col-span-full md:col-span-2 card-hover" data-testid="weekly-chart-card">
          <CardHeader>
            <CardTitle>Actividad Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-2">
              {weekStats?.dailyStats && Object.entries(weekStats.dailyStats).map(([date, data]) => {
                const maxPomodoros = Math.max(...Object.values(weekStats.dailyStats).map(d => d.pomodoros), 1);
                const height = maxPomodoros > 0 ? (data.pomodoros / maxPomodoros) * 100 : 0;
                const dayName = new Date(date).toLocaleDateString('es', { weekday: 'short' });
                
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-muted rounded-t-md relative" style={{ height: '100px' }}>
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-md transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{dayName}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Modal */}
      <Dialog open={showActivityModal} onOpenChange={setShowActivityModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿En qué vas a trabajar?</DialogTitle>
            <DialogDescription>
              Describe brevemente la actividad para este pomodoro
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="activity-description">Actividad</Label>
              <Input
                id="activity-description"
                data-testid="activity-input"
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Ej: Revisar documentación del proyecto"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && activityDescription.trim()) {
                    startTimerWithActivity();
                  }
                }}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowActivityModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 btn-primary"
                onClick={startTimerWithActivity}
                data-testid="confirm-activity-btn"
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Pomodoro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
