import { useState, useEffect } from 'react';
import { projectsApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';

export const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting || !formName.trim()) return;
    setIsSubmitting(true);
    
    try {
      await projectsApi.create({ name: formName });
      toast.success('Proyecto creado');
      setIsCreateOpen(false);
      resetForm();
      loadProjects();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Error al crear proyecto';
      toast.error(errorMsg);
      if (error.response?.status === 400) {
        setIsCreateOpen(false);
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingProject || isSubmitting || !formName.trim()) return;
    setIsSubmitting(true);
    
    try {
      await projectsApi.update(editingProject.projectId, { name: formName });
      toast.success('Proyecto actualizado');
      setIsEditOpen(false);
      setEditingProject(null);
      resetForm();
      loadProjects();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar proyecto');
    } finally {
      setIsSubmitting(false);
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
    setIsEditOpen(true);
  };

  const handleCreateOpenChange = (open) => {
    setIsCreateOpen(open);
    if (!open) resetForm();
  };

  const handleEditOpenChange = (open) => {
    setIsEditOpen(open);
    if (!open) {
      setEditingProject(null);
      resetForm();
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
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
        
        <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
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
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-project-name">Nombre del proyecto</Label>
                <Input
                  id="create-project-name"
                  data-testid="project-name-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Mi proyecto"
                  autoFocus
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full btn-primary" 
                data-testid="project-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
              </Button>
            </form>
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
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1 flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    {project.name}
                  </CardTitle>
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
                <span className="text-xs text-muted-foreground">
                  Creado {new Date(project.createdAt).toLocaleDateString('es')}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Proyecto</DialogTitle>
            <DialogDescription>
              Actualiza el nombre de tu proyecto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Nombre del proyecto</Label>
              <Input
                id="edit-project-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Mi proyecto"
                autoFocus
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
