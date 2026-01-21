import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Users,
  Crown,
  Shield,
  User,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export const UsersPage = () => {
  const { user, company } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user can manage users (owner or admin)
  const canManageUsers = user?.role === 'owner' || user?.role === 'admin';
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (canManageUsers) {
      loadUsers();
    }
  }, [canManageUsers]);

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setUsers(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('No tienes permisos para ver usuarios');
      } else {
        toast.error('Error al cargar usuarios');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormEmail('');
    setFormPassword('');
    setFormDisplayName('');
    setFormRole('user');
    setShowPassword(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await usersApi.create({
        email: formEmail,
        password: formPassword,
        displayName: formDisplayName,
        role: formRole
      });
      toast.success('Usuario creado exitosamente');
      setIsCreateOpen(false);
      resetForm();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingUser || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await usersApi.update(editingUser.uid, {
        displayName: formDisplayName,
        role: formRole
      });
      toast.success('Usuario actualizado');
      setIsEditOpen(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${userName}?`)) return;
    
    try {
      await usersApi.delete(userId);
      toast.success('Usuario eliminado');
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const openEditDialog = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormDisplayName(userToEdit.displayName);
    setFormRole(userToEdit.role);
    setIsEditOpen(true);
  };

  const handleCreateOpenChange = (open) => {
    setIsCreateOpen(open);
    if (!open) resetForm();
  };

  const handleEditOpenChange = (open) => {
    setIsEditOpen(open);
    if (!open) {
      setEditingUser(null);
      resetForm();
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <Crown className="w-3 h-3 mr-1" />
            Propietario
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <User className="w-3 h-3 mr-1" />
            Usuario
          </Badge>
        );
    }
  };

  // Redirect if user can't manage users
  if (!loading && !canManageUsers) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8" data-testid="users-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los usuarios de {company?.name}
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
          <DialogTrigger asChild>
            <Button className="btn-primary" data-testid="create-user-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Usuario</DialogTitle>
              <DialogDescription>
                Agrega un nuevo usuario a tu empresa
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nombre completo</Label>
                <Input
                  id="user-name"
                  data-testid="user-name-input"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="Juan Pérez"
                  autoFocus
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-email">Correo electrónico</Label>
                <Input
                  id="user-email"
                  data-testid="user-email-input"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="user-password"
                    data-testid="user-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-role">Rol</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Usuario
                      </div>
                    </SelectItem>
                    {isOwner && (
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Admin
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formRole === 'admin' 
                    ? 'Los admins pueden gestionar usuarios y proyectos'
                    : 'Los usuarios pueden usar el timer y ver sus estadísticas'
                  }
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full btn-primary" 
                data-testid="user-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipo ({users.length})
          </CardTitle>
          <CardDescription>
            Todos los usuarios de tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay usuarios en tu empresa</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {u.displayName?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <span className="font-medium">{u.displayName}</span>
                        {u.uid === user?.uid && (
                          <Badge variant="outline" className="text-xs">Tú</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('es')}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role !== 'owner' && u.uid !== user?.uid && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(u)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {(isOwner || u.role !== 'admin') && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(u.uid, u.displayName)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Permisos de rol</p>
              <ul className="space-y-1">
                <li><strong>Propietario:</strong> Control total, gestiona admins y usuarios</li>
                <li><strong>Admin:</strong> Gestiona usuarios y proyectos</li>
                <li><strong>Usuario:</strong> Usa el timer y ve sus estadísticas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Actualiza la información del usuario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Nombre completo</Label>
              <Input
                id="edit-user-name"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="Juan Pérez"
                autoFocus
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input
                value={editingUser?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">El email no se puede cambiar</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-user-role">Rol</Label>
              <Select 
                value={formRole} 
                onValueChange={setFormRole}
                disabled={!isOwner && editingUser?.role === 'admin'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Usuario
                    </div>
                  </SelectItem>
                  {isOwner && (
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Admin
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
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

export default UsersPage;
