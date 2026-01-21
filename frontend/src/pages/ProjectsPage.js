import { useState, useEffect } from 'react';
import { projectsApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  FolderOpen,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';

const PROJECT_COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', 
  '#2196F3', '#00BCD4', '#009688', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFC107', '#FF9800',
  '#FF5722', '#795548', '#607D8B'
];

export const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#E91E63');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (error) {
      toast.error('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor('#E91E63');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    try {
      await projectsApi.create({
        name: formName,
        description: formDescription,
        color: formColor
      });
      toast.success('Proyecto creado');
      setIsCreateOpen(false);
      resetForm();
      loadProjects();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear proyecto');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    
    try {
      await projectsApi.update(editingProject.projectId, {
        name: formName,
        description: formDescription,
        color: formColor
      });
      toast.success('Proyecto actualizado');
      setIsEditOpen(false);
      setEditingProject(null);
      resetForm();
      loadProjects();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar proyecto');
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('¿Estás seguro de eliminar este proyecto?')) return;
    
    try {
      await projectsApi.delete(projectId);
      toast.success('Proyecto eliminado');
      loadProjects();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar proyecto');
    }
  };

  const openEditDialog = (project) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormDescription(project.description);
    setFormColor(project.color);
    setIsEditOpen(true);
  };

  const ProjectForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-name">Nombre del proyecto</Label>
        <Input
          id="project-name"
          data-testid="project-name-input"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Mi proyecto"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="project-description">Descripción (opcional)</Label>
        <Textarea
          id="project-description"
          data-testid="project-description-input"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder="Describe tu proyecto..."
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setFormColor(color)}
              className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                formColor === color ? 'ring-2 ring-offset-2 ring-foreground' : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      
      <Button type="submit" className="w-full btn-primary" data-testid="project-submit-btn">
        {submitLabel}
      </Button>
    </form>
  );

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8" data-testid="projects-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground mt-1">
            Organiza tu trabajo en proyectos
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" data-testid="create-project-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Proyecto</DialogTitle>
              <DialogDescription>
                Crea un nuevo proyecto para organizar tus pomodoros
              </DialogDescription>
            </DialogHeader>
            <ProjectForm onSubmit={handleCreate} submitLabel="Crear Proyecto" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay proyectos</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea tu primer proyecto para empezar a trackear tu tiempo
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Crear Proyecto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Card 
              key={project.projectId} 
              className="card-hover relative overflow-hidden"
              data-testid={`project-card-${project.projectId}`}
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: project.color }}
              />
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </CardTitle>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(project)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(project.projectId)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant={project.isActive ? 'default' : 'secondary'}>
                    {project.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Creado {new Date(project.createdAt).toLocaleDateString('es')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Proyecto</DialogTitle>
            <DialogDescription>
              Actualiza la información de tu proyecto
            </DialogDescription>
          </DialogHeader>
          <ProjectForm onSubmit={handleEdit} submitLabel="Guardar Cambios" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
