import { useState, useEffect } from 'react';
import { timeEntriesApi, projectsApi, statsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  CalendarDays, 
  Clock, 
  Coffee, 
  Target,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

export const HistoryPage = () => {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState('all');
  const [viewMode, setViewMode] = useState('day'); // day, week
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { locale: es }));

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [selectedDate, selectedProject, viewMode, weekStart]);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (viewMode === 'day') {
        params.date = format(selectedDate, 'yyyy-MM-dd');
      }
      
      if (selectedProject !== 'all') {
        params.projectId = selectedProject;
      }
      
      const response = await timeEntriesApi.getAll(params);
      
      // Filter by week if needed
      let filteredEntries = response.data;
      if (viewMode === 'week') {
        const weekEnd = endOfWeek(weekStart, { locale: es });
        filteredEntries = response.data.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });
      }
      
      setEntries(filteredEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getProjectById = (projectId) => {
    return projects.find(p => p.projectId === projectId);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'pomodoro':
        return <Target className="w-4 h-4 text-primary" />;
      case 'break':
        return <Coffee className="w-4 h-4 text-emerald-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'pomodoro':
        return <Badge variant="default">Pomodoro</Badge>;
      case 'break':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Descanso</Badge>;
      default:
        return <Badge variant="outline">Manual</Badge>;
    }
  };

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  // Calculate totals
  const totalPomodoros = entries.filter(e => e.type === 'pomodoro').length;
  const totalWorkTime = entries
    .filter(e => e.type !== 'break')
    .reduce((sum, e) => sum + e.duration, 0);
  const totalBreakTime = entries
    .filter(e => e.type === 'break')
    .reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="p-6 lg:p-8 space-y-8" data-testid="history-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial</h1>
          <p className="text-muted-foreground mt-1">
            Revisa tu actividad y registros de tiempo
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode */}
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="rounded-r-none"
            >
              Día
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-l-none"
            >
              Semana
            </Button>
          </div>

          {/* Project Filter */}
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]" data-testid="project-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.projectId} value={project.projectId}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar / Navigation */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            {viewMode === 'day' ? (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={es}
                className="rounded-md"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="font-medium text-sm">
                    {format(weekStart, 'd MMM', { locale: es })} - {format(endOfWeek(weekStart, { locale: es }), 'd MMM yyyy', { locale: es })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setWeekStart(startOfWeek(new Date(), { locale: es }))}
                >
                  Ir a esta semana
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats & Entries */}
        <div className="lg:col-span-3 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{totalPomodoros}</div>
                <p className="text-sm text-muted-foreground">Pomodoros</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{formatDuration(totalWorkTime)}</div>
                <p className="text-sm text-muted-foreground">Trabajo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{formatDuration(totalBreakTime)}</div>
                <p className="text-sm text-muted-foreground">Descansos</p>
              </CardContent>
            </Card>
          </div>

          {/* Entries List */}
          <Card data-testid="entries-list">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Registros
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No hay registros para {viewMode === 'day' ? 'este día' : 'esta semana'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedEntries)
                    .sort(([a], [b]) => new Date(b) - new Date(a))
                    .map(([date, dateEntries]) => (
                      <div key={date}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-medium">
                            {isToday(new Date(date)) ? 'Hoy' : format(new Date(date), 'EEEE, d MMMM', { locale: es })}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        
                        <div className="space-y-2">
                          {dateEntries.map(entry => {
                            const project = getProjectById(entry.projectId);
                            return (
                              <div
                                key={entry.entryId}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {getTypeIcon(entry.type)}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {project && (
                                        <div 
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: project.color }}
                                        />
                                      )}
                                      <span className="font-medium">
                                        {project?.name || 'Proyecto desconocido'}
                                      </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {format(new Date(entry.createdAt), 'HH:mm', { locale: es })}
                                      {entry.notes && ` · ${entry.notes}`}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  {getTypeBadge(entry.type)}
                                  <span className="font-mono text-sm font-medium">
                                    {formatDuration(entry.duration)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
