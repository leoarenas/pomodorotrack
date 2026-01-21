import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { 
  User, 
  Building2, 
  Settings2, 
  Crown,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { user, company, createCompany, hasCompany } = useAuth();
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    
    setLoading(true);
    try {
      await createCompany(companyName);
      toast.success('¡Empresa creada exitosamente!');
      setIsCreateCompanyOpen(false);
      setCompanyName('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear empresa');
    } finally {
      setLoading(false);
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
        return <Badge variant="default">Admin</Badge>;
      default:
        return <Badge variant="secondary">Usuario</Badge>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-4xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu perfil y configuración de empresa
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil
          </CardTitle>
          <CardDescription>
            Tu información personal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{user?.displayName}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
              {getRoleBadge(user?.role)}
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">ID de Usuario</Label>
              <p className="font-mono text-sm">{user?.uid?.slice(0, 8)}...</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Miembro desde</Label>
              <p className="text-sm">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Empresa
          </CardTitle>
          <CardDescription>
            {hasCompany ? 'Información de tu empresa' : 'Crea o únete a una empresa'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasCompany ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{company?.name}</h3>
                  <Badge 
                    variant={company?.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                    className={company?.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}
                  >
                    {company?.subscriptionStatus === 'active' ? 'Activo' : company?.subscriptionStatus}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">ID de Empresa</Label>
                  <p className="font-mono text-sm">{company?.companyId?.slice(0, 8)}...</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Creada</Label>
                  <p className="text-sm">
                    {company?.createdAt ? new Date(company.createdAt).toLocaleDateString('es', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Sin empresa</h3>
              <p className="text-muted-foreground mb-4">
                Crea una empresa para comenzar a gestionar proyectos y equipos
              </p>
              
              <Dialog open={isCreateCompanyOpen} onOpenChange={setIsCreateCompanyOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" data-testid="create-company-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Empresa</DialogTitle>
                    <DialogDescription>
                      Crea tu empresa para empezar a colaborar con tu equipo
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateCompany} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nombre de la empresa</Label>
                      <Input
                        id="company-name"
                        data-testid="company-name-input"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Mi Empresa S.A."
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full btn-primary" 
                      disabled={loading}
                      data-testid="submit-company-btn"
                    >
                      {loading ? 'Creando...' : 'Crear Empresa'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Aplicación
          </CardTitle>
          <CardDescription>
            Configuración general de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Duración Pomodoro</p>
              <p className="text-sm text-muted-foreground">25 minutos (estándar)</p>
            </div>
            <Badge variant="outline">Por defecto</Badge>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Descanso corto</p>
              <p className="text-sm text-muted-foreground">5 minutos</p>
            </div>
            <Badge variant="outline">Por defecto</Badge>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Descanso largo</p>
              <p className="text-sm text-muted-foreground">15 minutos (cada 4 pomodoros)</p>
            </div>
            <Badge variant="outline">Por defecto</Badge>
          </div>
          
          <p className="text-xs text-muted-foreground pt-4">
            La personalización de tiempos estará disponible en una próxima versión.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
