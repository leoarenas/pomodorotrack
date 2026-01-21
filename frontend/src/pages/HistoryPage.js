import { useState, useEffect } from 'react';
import { timeRecordsApi, projectsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  CalendarDays, 
  Clock, 
  Target,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

export const HistoryPage = () => {
  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState('all');
  const [viewMode, setViewMode] = useState('day');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { locale: es }));

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [selectedDate, selectedProject, viewMode, weekStart]);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (selectedProject !== 'all') {
        params.projectId = selectedProject;
      }
      
      const response = await timeRecordsApi.getAll(params);
      
      // Filter by date range
      let filteredRecords = response.data;
      
      if (viewMode === 'day') {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        filteredRecords = response.data.filter(record => 
          record.createdAt.startsWith(dateStr)
        );
      } else if (viewMode === 'week') {
        const weekEnd = endOfWeek(weekStart, { locale: es });
        filteredRecords = response.data.filter(record => {
          const recordDate = new Date(record.createdAt);
          return recordDate >= weekStart && recordDate <= weekEnd;
        });
      }
      
      setRecords(filteredRecords);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getProjectById = (projectId) => {
    return projects.find(p => p.projectId === projectId);
  };

  // Group records by date
  const groupedRecords = records.reduce((acc, record) => {
    const date = record.createdAt.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {});

  // Calculate totals
  const totalPomodoros = records.reduce((sum, r) => sum + (r.pomodoros || 0), 0);
  const totalMinutes = records.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);

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
                  {project.name}
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

        {/* Stats & Records */}
        <div className="lg:col-span-3 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{totalPomodoros}</div>
                <p className="text-sm text-muted-foreground">Pomodoros</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{formatDuration(totalMinutes)}</div>
                <p className="text-sm text-muted-foreground">Tiempo total</p>
              </CardContent>
            </Card>
          </div>

          {/* Records List */}
          <Card data-testid="records-list">
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
              ) : records.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No hay registros para {viewMode === 'day' ? 'este día' : 'esta semana'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedRecords)
                    .sort(([a], [b]) => new Date(b) - new Date(a))
                    .map(([date, dateRecords]) => (
                      <div key={date}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-medium">
                            {isToday(new Date(date)) ? 'Hoy' : format(new Date(date), 'EEEE, d MMMM', { locale: es })}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        
                        <div className="space-y-2">
                          {dateRecords.map(record => {
                            const project = getProjectById(record.projectId);
                            return (
                              <div
                                key={record.recordId}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Target className="w-4 h-4 text-primary" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {project?.name || 'Proyecto desconocido'}
                                      </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {format(new Date(record.createdAt), 'HH:mm', { locale: es })}
                                      {record.notes && ` · ${record.notes}`}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Badge variant="default">
                                    {record.pomodoros} 🍅
                                  </Badge>
                                  <span className="font-mono text-sm font-medium">
                                    {formatDuration(record.durationMinutes)}
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
